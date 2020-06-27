import React, { useRef } from 'react'
import Peer from 'simple-peer'
import wrtc from 'wrtc'
import axios from 'axios'
import Chat from './Chat'
export default class Canvas extends React.Component{
    state = {
        socket: this.props.socket,
        myName: this.props.name,
        chooseAWord: false,
        possibleWords: [],
        room: {name: this.props.match.params.roomName, clients: []},
        currentLeader: null,
        gameHasStarted: false,
        rtcPeers: [],
        connectedPeers: 0,
        lastPos: {},
        isMouseDrawing: false,
        remoteLastPos: [],
        canvasRef: React.createRef(),
        loading: !this.props.name
    }
    componentDidMount(){
        const {socket} = this.state
        axios.get(process.env.NODE_ENV === 'production' && `https://dibujio-server.herokuapp.com/api/room/${this.props.match.params.roomName}` || `http://localhost:5000/api/room/${this.props.match.params.roomName}`)
            .then( ({data: room}) => {
                this.setState({room: room})//, this.initPeers)
            })
        socket.on('assigned name', newName=>{
            this.setState({myName: newName})
        })
        socket.on('new leader', leader => {
            // let {room} = {...this.state}
            // room.leader = leader
            this.clearCanvas()
            this.setState({currentLeader: leader})
        })
        socket.on('new client', client => {
            const {room} = {...this.state}
            console.log(room)
            // if(!room.clients) room.clients = []
            // room.clients.push(client)
            // this.setState({room: room})
        })
        socket.on('finish time', newTime => {
            this.setState({timeFinish: Date.parse(newTime)})
        })
        socket.on('choose word', possibleWords => {
            this.setState({chooseAWord: true, possibleWords})
        })
        socket.on('signal', (data, clientName, remoteSocket) => {
            // console.log('signal! clientName: ', clientName)
            this.createPeer(data, clientName, remoteSocket)
        })
    }
    socketJoinRoom = () =>{
        const socket = this.state.socket
        const { room, myName} = {...this.state}
        socket.emit('join room', {selectedRoom: room.name, clientName: myName, isLeader: false})
    }
    createPeer = (data, clientName, remoteSocket) => {
        
        const {rtcPeers} = {...this.state}
        if(rtcPeers[clientName]){
            console.log('rtcpeers[',clientName,'] exists')
            // console.log(this.state.rtcPeers)
            // console.log(rtcPeers)
            rtcPeers[clientName].signal(data)
        }
        else{
            console.log('else')
            let newPeer = new Peer({initiator: false, trickle: true, 
                config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'turn:relay.backups.cz', username: 'webrtc', credential: 'webrtc' }] },
                wrtc})
            newPeer.clientName = clientName
            newPeer.signal(data)
            newPeer.on('signal', data => {this.forwardSignal(data, this.state.myName, remoteSocket)})
            newPeer.on('connect', () => {
                console.log('CONNECT')
                this.setState({connectedPeers: this.state.connectedPeers+1})
            })
            newPeer.on('data', data => {
                console.log('data: ' + data + clientName)
                this.drawTouchs(JSON.parse(data), 'red')
            })
            rtcPeers[clientName] = newPeer
            this.setState({
                rtcPeers: rtcPeers
            }, ()=>{console.log(rtcPeers)})
        }
    this.setState({rtcPeers: rtcPeers}, this.initCanvas)
    }
    initPeers = () => {
        const {room, rtcPeers} = {...this.state}
        room.clients && room.clients.map( client => {
            let newPeer = new Peer({initiator: true, trickle: true, 
                config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'turn:relay.backups.cz', username: 'webrtc', credential: 'webrtc' }] },
                wrtc})
            newPeer.on('signal', data => 
            {
                this.forwardSignal(JSON.stringify(data), this.state.myName, client.socket)
            })
            newPeer.clientName = client.name
            newPeer.on('connect', () => {
                console.log('CONNECT')
                this.state.socket.emit('2 clients connected', {client1: this.state.myName, client2: client.name})
                this.setState({connectedPeers: this.state.connectedPeers+1})
            })
            newPeer.on('data', data => {
                console.log('data: ' + data + client.name)
                if(newPeer.clientName === this.state.currentLeader){
                    this.drawTouchs(JSON.parse(data), 'red')
                }
                else console.log(newPeer.clientName, 'unsuccessfully tried to draw..')
            })
            rtcPeers[client.name] = newPeer
        })
        this.setState({rtcPeers: rtcPeers})
    }
    forwardSignal = (signal, myName, remoteSocket) => {
        const {socket} = this.state
        socket.emit('forward signal', signal, myName, remoteSocket)
    }
    initCanvas = () => {
        setInterval(this.updateTime, 1000)
    }
    touchStart = (evt) => {
        evt.preventDefault()
        if(this.state.myName === this.state.currentLeader){
            const rect = evt.target.getBoundingClientRect()
            const x = evt.targetTouches[0].pageX - rect.left
            const y = evt.targetTouches[0].pageY - rect.top
            this.setState({lastPos: {x, y}})
        }
    }
    mouseDown = (evt) => {
        evt.preventDefault()
        if(this.state.myName === this.state.currentLeader){
            const x = evt.nativeEvent.offsetX
            const y = evt.nativeEvent.offsetY
            this.setState({lastPos: {x, y}, isMouseDrawing: true})
        }
    }
    touchMove = (evt) => {
        evt.preventDefault()
        if(this.state.myName === this.state.currentLeader){
            const rect = evt.target.getBoundingClientRect()
            const x = evt.targetTouches[0].pageX - rect.left
            const y = evt.targetTouches[0].pageY - rect.top

            const touchsXY = {lastPos: this.state.lastPos, x, y}
            this.sendTouchs(JSON.stringify(touchsXY))
            this.drawTouchs(touchsXY)
        }
        else console.log('you cant draw yet!')
    }
    mouseMove = (evt) => {
        evt.preventDefault()
        if(this.state.myName === this.state.currentLeader && this.state.isMouseDrawing){
            const x = evt.nativeEvent.offsetX
            const y = evt.nativeEvent.offsetY
            const touchsXY = {lastPos: this.state.lastPos, x, y}
            this.sendTouchs(JSON.stringify(touchsXY))
            this.drawTouchs(touchsXY)
        }
    }
    mouseUp = (evt) => {
        this.setState({isMouseDrawing: false})
    }
    drawTouchs = (touchs, color = 'blue', remote = false) => {
        const myCanvas = this.state.canvasRef.current
        const ctx = myCanvas.getContext('2d')
        ctx.lineCap = 'round'
        ctx.lineWidth = '6'
        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.moveTo(touchs.lastPos.x, touchs.lastPos.y)
        ctx.lineTo(touchs.x, touchs.y)
        ctx.stroke()
        this.setState({lastPos: {x: touchs.x, y: touchs.y}})
    }
    clearCanvas = () => {
        const myCanvas = this.state.canvasRef.current
        const ctx = myCanvas.getContext('2d')
        ctx.clearRect(0, 0, myCanvas.width, myCanvas.height);
    }
    sendTouchs = (touchs) => {
        const {rtcPeers} = {...this.state}
        for(const peer in rtcPeers){
            if(rtcPeers[peer].connected){
                rtcPeers[peer].send(touchs)
            }
        }
    }
    chooseWord = (word) =>{
        const {socket} = this.state
        this.setState({chooseAWord: false, possibleWords: []})
        socket.emit('chose word', word)
    }
    handleChange = (e) => {
        e.preventDefault()
        let cloneState = {...this.state}
        cloneState[e.target.name] = e.target.value
        this.setState(cloneState)
    }
    updateTime = () => {
        this.setState({timer: new Date()})
    }
    render(){
        if(this.state.loading){
            return(
                <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                <p>Name:</p>
                <input type="text" name="myName" onChange={this.handleChange}/>
                <button onClick={() => {
                    this.setState({loading: false})
                    this.socketJoinRoom()
                    this.initPeers()
                    }}>JOIN</button>
                </div>                
            )
        }
        return( 
            <>
            { this.state.connectedPeers > 0 || <p>Waiting for peers..</p> }
            { this.state.connectedPeers > 0 && <><p>{this.state.currentLeader} is drawing</p> 
                <p>{Math.floor((this.state.timeFinish - this.state.timer)/1000)} seconds left</p>
            </>
            }
            {
                this.state.chooseAWord &&
                this.state.possibleWords.map( word => 
                    <button key={word} onClick={()=>{this.chooseWord(word)}}>
                        {word}
                    </button>                    
                )
            }
            <canvas style={{border: '1px solid black'}} ref={this.state.canvasRef} onMouseDown={this.mouseDown} onMouseMove={this.mouseMove} onMouseUp={this.mouseUp} onTouchMove={this.touchMove} onTouchStart={this.touchStart} onTouchEnd={this.touchEnd} id="myCanvas" width='300' height='500'></canvas>
            <Chat room={this.state.room} socket={this.state.socket} myName={this.state.myName}/>
            </>) 
    }
}
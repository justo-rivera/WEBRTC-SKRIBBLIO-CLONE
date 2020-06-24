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
        room: {name: this.props.match.params.roomName},
        currentLeader: null,
        gameHasStarted: false,
        rtcPeers: [],
        connectedPeers: 0,
        lastPos: {},
        remoteLastPos: [],
        canvasRef: React.createRef(),
        loading: !this.props.name
    }
    componentDidMount(){
        const {socket} = this.state
        axios.get(process.env.NODE_ENV === 'production' && `http://dibujio-server.herokuapp.com/api/room/${this.props.match.params.roomName}` || `http://localhost:5000/api/room/${this.props.match.params.roomName}`)
            .then( ({data: room}) => {
                this.setState({room})//, this.initPeers)
            })
        socket.on('assigned name', newName=>{
            console.log(newName)
            this.setState({myName: newName})
        })
        socket.on('new leader', leader => {
            // let {room} = {...this.state}
            // room.leader = leader
            this.setState({currentLeader: leader})
        })
        socket.on('finish time', newTime => {
            this.setState({timeFinish: Date.parse(newTime)})
        })
        socket.on('choose word', possibleWords => {
            this.setState({chooseAWord: true, possibleWords})
        })
    }
    updateTime = () => {
        this.setState({timer: new Date()})
    }
    initPeers = () => {
        const {room} = {...this.state}
        const rtcPeers = {}
        room.clients && room.clients.map( client => {
            let newPeer = new Peer({initiator: true, trickle: false, wrtc})
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
        this.state.socket.on('signal', (data, clientName, remoteSocket) => {
            console.log('signal! clientName: ', clientName)
            const {rtcPeers} = this.state
            if(rtcPeers[clientName]){
                console.log('rtcpeers[',clientName,'] exists')
                rtcPeers[clientName].signal(data)
            }
            else{
                let newPeer = new Peer({initiator: false, trickle: false, wrtc})
                newPeer.clientName = clientName
                newPeer.on('signal', data => {this.forwardSignal(data, this.state.myName, remoteSocket)})
                newPeer.signal(data)
                newPeer.on('connect', () => {
                    console.log('CONNECT')
                    this.setState({connectedPeers: this.state.connectedPeers+1})
                })
                newPeer.on('data', data => {
                    console.log('data: ' + data + clientName)
                    this.drawTouchs(JSON.parse(data), 'red')
                })
                rtcPeers[clientName] = newPeer
                console.log(clientName)
                this.setState({
                    rtcPeers
                }, ()=>{console.log(rtcPeers)})
            }
        })
        this.setState({rtcPeers}, this.initCanvas)
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
            const {pageX: x, pageY: y} = evt.changedTouches[0]
            this.setState({lastPos: {x, y}})
        }
    }
    touchMove = (evt) => {
        evt.preventDefault()
        if(this.state.myName === this.state.currentLeader){
            const touchs = evt.changedTouches
            const touchsXY = {lastPos: this.state.lastPos, x: touchs[0].pageX, y: touchs[0].pageY}
            this.sendTouchs(JSON.stringify(touchsXY))
            this.drawTouchs(touchsXY)
        }
        else console.log('you cant draw yet!')
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
    sendTouchs = (touchs) => {
        const {rtcPeers} = this.state
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
        let cloneState = this.state
        cloneState[e.target.name] = e.target.value
        this.setState(cloneState)
    }
    render(){
        if(this.state.loading){
            return(
                <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                <p>Name:</p>
                <input type="text" name="myName" onChange={this.handleChange}/>
                <button onClick={() => {
                    this.setState({loading: false})
                    this.props.joinRoom(this.state.room.name, this.state.myName)
                    this.initPeers()
                    }}>JOIN</button>
                </div>                
            )
        }
        console.log(this.state.connectedPeers > 0 || '<p>Waiting for peers..</p>')
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
                    <button onClick={()=>{this.chooseWord(word)}}>
                        {word}
                    </button>                    
                )
            }
            <canvas style={{border: '1px solid black'}} ref={this.state.canvasRef} onTouchMove={this.touchMove} onTouchStart={this.touchStart} onTouchEnd={this.touchEnd} id="myCanvas" width='300' height='500'></canvas>
            <Chat room={this.state.room} socket={this.state.socket} myName={this.state.myName}/>
            </>) 
    }
}
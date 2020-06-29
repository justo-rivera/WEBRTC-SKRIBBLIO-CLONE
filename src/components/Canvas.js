import React, { useRef } from 'react'
import Peer from 'simple-peer'
import wrtc from 'wrtc'
import axios from 'axios'
import Chat from './Chat'
import eraser from '../images/eraser.png'
import '../canvas.css'
export default class Canvas extends React.Component{
    state = {
        socket: this.props.socket,
        myName: this.props.name,
        chooseAWord: false,
        possibleWords: [],
        room: {name: this.props.match.params.roomName, clients: []},
        currentLeader: null,
        ranking: [],
        gameHasStarted: false,
        rtcPeers: [],
        connectedPeers: 0,
        lastPos: {},
        color: 'black',
        lineWidth: '6',
        isMouseDrawing: false,
        remoteLastPos: [],
        canvasRef: React.createRef(),
        rankingRef: React.createRef(),
        loading: !this.props.name
    }
    componentDidMount(){
        const {socket} = this.state
        axios.get(process.env.NODE_ENV === 'production' && `https://dibujio-server.herokuapp.com/api/room/${this.props.match.params.roomName}` || `http://localhost:5000/api/room/${this.props.match.params.roomName}`)
            .then( ({data: room}) => {
                this.setState({room: room}, this.initPeers)
            })
        socket.on('assigned name', newName=>{
            this.setState({myName: newName})
        })
        socket.on('joined', ({currentLeader, timeFinish}) => {
            this.setState({currentLeader, timeFinish: Date.parse(timeFinish)})
        })
        socket.on('new leader', data => {
            // let {room} = {...this.state}
            // room.leader = leader
            const isFirstLeader = this.state.currentLeader
            this.clearCanvas()
            this.setState({currentLeader: data.leader, ranking: data.ranking}, () => {
                if(isFirstLeader) this.displayRanking() })
        })
        socket.on('new client', client => {
            //this.newClient(client)
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
        if(rtcPeers[clientName] && rtcPeers[clientName].destroyed){
            delete rtcPeers[clientName]
        }
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
                if(this.state.currentLeader === this.state.myName){
                    const myCanvas = this.state.canvasRef.current
                    const image = myCanvas.toDataURL()
                    const data = {type: 'image', image}
                    newPeer.send(JSON.stringify(data))
                }
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
            newPeer.on('data', dataJSON => {
                const data = JSON.parse(dataJSON)
                console.log('raw data', dataJSON)
                if(data.type === 'image'){
                    console.log('image received..', data)
                    this.paintBackupImage(data.image)
                }
                else if(data.type === 'paint' && newPeer.clientName === this.state.currentLeader){
                    this.drawTouchs(data, 'red')
                }
                else console.log(newPeer.clientName, 'unsuccessfully tried to draw..', data)
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
            const myCanvas = this.state.canvasRef.current
            const bounds = myCanvas.getBoundingClientRect()
            const x = (evt.targetTouches[0].pageX - bounds.left)/(bounds.width)
            const y = (evt.targetTouches[0].pageY - bounds.top)/(bounds.height)
            console.log(x, 'bounds.width()-->', bounds.width)
            this.setState({lastPos: {x, y}})
        }
    }
    mouseDown = (evt) => {
        evt.preventDefault()
        if(this.state.myName === this.state.currentLeader){
            const myCanvas = this.state.canvasRef.current
            const bounds = myCanvas.getBoundingClientRect()
            const x = (evt.nativeEvent.pageX - bounds.left)/(bounds.width)
            const y = (evt.nativeEvent.pageY - bounds.top)/(bounds.height)
            this.setState({lastPos: {x, y}, isMouseDrawing: true})
        }
    }
    touchMove = (evt) => {
        evt.preventDefault()
        if(this.state.myName === this.state.currentLeader){
            const myCanvas = this.state.canvasRef.current
            const bounds = myCanvas.getBoundingClientRect()
            const x = (evt.targetTouches[0].pageX - bounds.left)/(bounds.width)
            const y = (evt.targetTouches[0].pageY - bounds.top)/(bounds.height)
            console.log(x,y)
            const touchsXY = {type: 'paint', lastPos: this.state.lastPos, x, y, color: this.state.color, lineWidth: this.state.lineWidth}
            this.sendTouchs(JSON.stringify(touchsXY))
            this.drawTouchs(touchsXY)
        }
        else console.log('you cant draw yet!')
    }
    mouseMove = (evt) => {
        evt.preventDefault()
        if(this.state.myName === this.state.currentLeader && this.state.isMouseDrawing){
            const myCanvas = this.state.canvasRef.current
            const bounds = myCanvas.getBoundingClientRect()
            const x = (evt.nativeEvent.pageX - bounds.left)/(bounds.width)
            const y = (evt.nativeEvent.pageY - bounds.top)/(bounds.height)
            console.log(x,y)
            const touchsXY = {type: 'paint',lastPos: this.state.lastPos, x, y}
            this.sendTouchs(JSON.stringify(touchsXY))
            this.drawTouchs(touchsXY)
        }
    }
    mouseUp = (evt) => {
        this.setState({isMouseDrawing: false})
    }
    drawTouchs = (touchs, remote = false) => {
        const myCanvas = this.state.canvasRef.current
        const ctx = myCanvas.getContext('2d')
        const lastX = touchs.lastPos.x * myCanvas.width
        const lastY = touchs.lastPos.y * myCanvas.height
        const x = touchs.x * myCanvas.width
        const y = touchs.y * myCanvas.height
        ctx.globalCompositeOperation = 'source-over'
        ctx.lineCap = 'round'
        ctx.lineWidth = touchs.lineWidth
        ctx.beginPath()
        ctx.strokeStyle = touchs.color
        ctx.moveTo(lastX, lastY)
        ctx.lineTo(x, y)
        ctx.stroke()
        this.setState({lastPos: {x: touchs.x, y: touchs.y}})
    }
    sendTouchs = (touchs) => {
        const {rtcPeers} = {...this.state}
        for(const peer in rtcPeers){
            if(rtcPeers[peer].connected){
                rtcPeers[peer].send(touchs)
            }
        }
    }
    paintBackupImage = (imageURI) => {
        const myCanvas = this.state.canvasRef.current
        const ctx = myCanvas.getContext('2d')
        let image = new Image()
        image.onload = () => {
            ctx.globalCompositeOperation = 'destination-over'
            ctx.drawImage(image, 0, 0)
        }
        image.src = imageURI
    }
    displayRanking = () => {
        let myCanvas = this.state.canvasRef.current
        let rankingDiv = this.state.rankingRef.current
        let rankingList = this.state.ranking.map( r => `<li>${r.client.name}: ${r.points}</li>`)
        rankingDiv.innerHTML = `Ranking: <ul> ${rankingList.join('')} </ul>`
        myCanvas.style.display = 'none'
        rankingDiv.style.display = 'block'
        setTimeout( () => {
            myCanvas.style.display = 'block'
            rankingDiv.style.display = 'none'
        }, 8*1000)
    }
    clearCanvas = () => {
        const myCanvas = this.state.canvasRef.current
        const ctx = myCanvas.getContext('2d')
        ctx.clearRect(0, 0, myCanvas.width, myCanvas.height);
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
    changeColor = (evt) => {
        const color = evt.target.style.backgroundColor;
        this.setState({color, lineWidth: '6'})
    }
    selectEraser = (evt) => {
        this.setState({color: 'white', lineWidth: '24'})
    }
    render(){
        return( 
            <>
            { this.state.connectedPeers > 0 || <p>Waiting for peers..</p> }
            { this.state.connectedPeers > 0 && <><p>{this.state.currentLeader} is drawing... {Math.floor((this.state.timeFinish - this.state.timer)/1000)} seconds left</p>
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
            <div style={{display: 'none', width: '99vw', height: '70vh'}} ref={this.state.rankingRef}>
                Ranking
            </div>
            <canvas style={{border: '1px solid black'}} ref={this.state.canvasRef} onMouseDown={this.mouseDown} onMouseMove={this.mouseMove} onMouseUp={this.mouseUp} onTouchMove={this.touchMove} onTouchStart={this.touchStart} onTouchEnd={this.touchEnd} id="myCanvas" width='300' height='500'></canvas>
            <table className='palette'>
                <tr>
                    <td className='palette-color' onClick={this.changeColor} style={{backgroundColor: 'black'}}></td>
                    <td className='palette-color' onClick={this.changeColor} style={{backgroundColor: 'grey'}}></td>
                    <td className='palette-color' onClick={this.changeColor} style={{backgroundColor: 'red'}}></td>
                    <td className='palette-color' onClick={this.changeColor} style={{backgroundColor: 'orange'}}></td>
                    <td className='palette-color' onClick={this.changeColor} style={{backgroundColor: 'yellow'}}></td>
                    <td className='palette-color' onClick={this.changeColor} style={{backgroundColor: 'green'}}></td>
                    <td className='palette-color' onClick={this.changeColor} style={{backgroundColor: 'cyan'}}></td>
                    <td className='palette-eraser' onClick={this.selectEraser}></td>
                </tr>
            </table>
            <Chat room={this.state.room} socket={this.state.socket} myName={this.state.myName}/>
            </>) 
    }
}
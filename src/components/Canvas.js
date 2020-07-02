import React, { useRef } from 'react'
import config from '../config'
import Peer from 'simple-peer'
import wrtc from 'wrtc'
import axios from 'axios'
import Chat from './Chat'
import '../canvas.css'
export default class Canvas extends React.Component{
    state = {
        socket: this.props.socket,
        myName: this.props.name,
        chooseAWord: false,
        possibleWords: [],
        room: {name: this.props.match.params.roomName, clients: []},
        lastWord: '',
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
        chatRef: React.createRef(),
        rankingRef: React.createRef(),
        loading: !this.props.name,
        styledMobile: false,
        styledDesktop: false
    }
    componentDidMount(){
        const myCanvas = this.state.canvasRef.current
        myCanvas.addEventListener('touchmove', this.touchMove, {passive: false})
        myCanvas.addEventListener('touchstart', this.touchStart, {passive: false})
        //window.addEventListener('resize', this.changeStyle)
        window.addEventListener('mouseup', this.mouseUp)
        setTimeout(this.changeStyle, 100)
        const {socket} = this.state

        axios.get(`${config.API_URL}/room/${this.props.match.params.roomName}`)
            .then( ({data: room}) => {
                this.setState({room}, this.initPeers)
            })
        socket.on('assigned name', newName => {
            this.setState({myName: newName})
        })
        socket.on('joined', ({currentLeader, timeFinish}) => {
            this.setState({currentLeader, timeFinish: Date.parse(timeFinish)})
        })
        socket.on('new leader', data => {
            const isNotFirstLeader = this.state.currentLeader
            this.clearCanvas()
            this.setState({currentLeader: data.leader, ranking: data.ranking, color: 'black', lineWidth: '6', timeFinish: Date.parse(data.timeFinish), lastWord: data.lastWord}, () => {
                if(isNotFirstLeader) this.displayRanking() })
        })
        socket.on('choose word', possibleWords => {
            this.setState({chooseAWord: true, possibleWords, word: ''})
        })
        socket.on('signal', (data, clientName, remoteSocket) => {
            this.createPeer(data, clientName, remoteSocket)
        })
        socket.on('client left', clientName => {
            const {rtcPeers} = {...this.state}
            if(rtcPeers[clientName]) {
                delete rtcPeers[clientName]
                this.setState({rtcPeers, connectedPeers: this.state.connectedPeers-1})
            }
        })
        socket.on('room paused', () => {
            this.clearCanvas()
            this.setState({currentLeader: '', word: ''})
        })
        socket.on('game ended', ({ranking, lastWord}) => {
            this.setState({ranking, lastWord}, this.endGame)
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
            this.setState({connectedPeers: this.state.connectedPeers-1})
        }
        if(rtcPeers[clientName]){
            console.log('rtcpeers[',clientName,'] exists')
            rtcPeers[clientName].signal(data)
        }
        else{
            let newPeer = new Peer({initiator: false, trickle: true, 
                config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'turn:relay.backups.cz', username: 'webrtc', credential: 'webrtc' }] },
                wrtc})
            newPeer.clientName = clientName
            newPeer.signal(data)
            newPeer.on('signal', data => {this.forwardSignal(data, this.state.myName, remoteSocket)})
            newPeer.on('connect', () => {
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
            newPeer.on('close', () => {
                console.log('closed a connection')
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
            const touchsXY = {type: 'paint', color: this.state.color, lineWidth: this.state.lineWidth, lastPos: this.state.lastPos, x, y}
            this.sendTouchs(JSON.stringify(touchsXY))
            this.drawTouchs(touchsXY)
        }
    }
    mouseUp = (evt) => {
        if(this.state.isMouseDrawing) this.setState({isMouseDrawing: false})
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
        let rankingList = this.state.ranking.map( r => `<li>${r.client}: ${r.points}</li>`)
        rankingDiv.innerHTML = `Last word was <b>${this.state.lastWord}</b><br/>Ranking: <ul> ${rankingList.join('')} </ul>`
        myCanvas.style.display = 'none'
        rankingDiv.style.display = 'block'
        setTimeout( () => {
            myCanvas.style.display = 'block'
            rankingDiv.style.display = 'none'
        }, 8*1000)
    }
    endGame = () => {
        const {rtcPeers} = {...this.state}
        for(let peer of rtcPeers){
            delete rtcPeers[peer]
        }
        this.setState({connectedPeers: 0, chooseAWord: false})
        let myCanvas = this.state.canvasRef.current
        let rankingDiv = this.state.rankingRef.current
        let rankingList = this.state.ranking.map( r => `<li>${r.client}: ${r.points}</li>`)
        rankingDiv.innerHTML = `<h2>Game finished!</h2><br/>`
        rankingDiv.innerHTML += `Last word was <b>${this.state.lastWord}</b><br/>Final Ranking: <ul> ${rankingList.join('')} </ul><br/><br/><br/><button className="play-again" onclick="location.reload()">Play again</button>`
        myCanvas.style.display = 'none'
        rankingDiv.style.display = 'block'
    }
    clearCanvas = () => {
        const myCanvas = this.state.canvasRef.current
        const ctx = myCanvas.getContext('2d')
        ctx.clearRect(0, 0, myCanvas.width, myCanvas.height);
    }
    chooseWord = (word) =>{
        const {socket} = this.state
        this.setState({chooseAWord: false, possibleWords: [], word})
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
        const color = evt.currentTarget.style.backgroundColor;
        this.setState({color, lineWidth: '6'})
    }
    selectEraser = (evt) => {
        this.setState({color: 'white', lineWidth: '24'})
    }
    changeStyle = () => {
        if(!this.state.styledDesktop && !this.state.styledMobile){
            if(window.screen.height <= window.screen.width) this.changeStyleDesktop()
            else this.changeStyleMobile()
        }
    }
    changeStyleMobile = () => {
        this.setState({styledMobile: true})
        document.getElementById('eraser').style.backgroundSize = window.innerWidth * 0.08 + 'px' + ' ' + window.innerWidth * 0.08 + 'px'
        const myCanvas = this.state.canvasRef.current
        myCanvas.width = window.innerWidth * 0.95
        myCanvas.height = window.innerHeight * 0.7
        document.querySelectorAll('.palette-color').forEach( c => {
            c.style.width = window.innerWidth * 0.08 + 'px'
            c.style.height = window.innerWidth * 0.08 + 'px'
        })
        document.getElementById('eraser').style.width = window.innerWidth * 0.08 + 'px'
        document.getElementById('eraser').style.height = window.innerWidth * 0.08 + 'px'
        const ranking = document.getElementById('ranking')
        ranking.style.width = window.innerWidth * 0.95 + 'px'
        ranking.style.height = window.innerHeight * 0.7 + 'px'
    }
    changeStyleDesktop = () => {
        this.setState({styledDesktop: true})
        document.querySelectorAll('.palette-color').forEach( c => {
            c.style.width = window.innerHeight * 0.048 + 'px'
            c.style.height = window.innerHeight * 0.048 + 'px'
        })
        document.getElementById('eraser').style.width = window.innerHeight * 0.048 + 'px'
        document.getElementById('eraser').style.height = window.innerHeight * 0.048 + 'px'
        document.getElementById('eraser').style.backgroundSize = window.innerHeight * 0.048 + 'px' + ' ' + window.innerHeight * 0.048 + 'px'
        const myCanvas = this.state.canvasRef.current
        myCanvas.width = window.innerHeight * 0.55
        myCanvas.height = window.innerHeight * 0.70
        const ranking = document.getElementById('ranking')
        ranking.style.width = window.innerHeight * 0.55 + 'px'
        ranking.style.height = window.innerHeight * 0.70 + 'px'
    }
    render(){
        return( 
            <div id="draw-container">
            <div className="roomDraw">
            { this.state.connectedPeers > 0 || <p>Waiting for peers..</p> }
            { this.state.connectedPeers > 0 && this.state.myName !== this.state.currentLeader && <><p><b>{this.state.currentLeader}</b> is drawing... {Math.floor((this.state.timeFinish - this.state.timer)/1000)} seconds left</p>
            </>
            }
            { this.state.connectedPeers > 0 && this.state.myName === this.state.currentLeader && !this.state.chooseAWord && <><p>You are drawing <b>{this.state.word}</b>... {Math.floor((this.state.timeFinish - this.state.timer)/1000)} seconds left</p>
            </>
            }
            {this.state.chooseAWord &&
             <p>Choose a word:</p>
            }
            {this.state.chooseAWord &&
                this.state.possibleWords.map( word => 
                    <button key={word} onClick={()=>{this.chooseWord(word)}}>
                        {word}
                    </button>                    
                )
            } 
            {this.state.chooseAWord &&
             <br/>
            }           
            <div id='ranking' style={{display: 'none'}} ref={this.state.rankingRef}>
                Ranking
            </div>
            <canvas style={{border: '1px solid black'}} ref={this.state.canvasRef} onMouseDown={this.mouseDown} onMouseMove={this.mouseMove} onMouseUp={this.mouseUp} id="myCanvas" width='300' height='200'></canvas>
            <table className='palette'>
            <tbody>
                <tr>
                    <td className='palette-color' onClick={this.changeColor} style={{backgroundColor: 'black'}}></td>
                    <td className='palette-color' onClick={this.changeColor} style={{backgroundColor: 'grey'}}></td>
                    <td className='palette-color' onClick={this.changeColor} style={{backgroundColor: 'yellow'}}></td>
                    <td className='palette-color' onClick={this.changeColor} style={{backgroundColor: 'red'}}></td>
                    <td className='palette-color' onClick={this.changeColor} style={{backgroundColor: 'orange'}}></td>
                    <td className='palette-color' onClick={this.changeColor} style={{backgroundColor: 'greenyellow'}}></td>
                    <td className='palette-color' onClick={this.changeColor} style={{backgroundColor: 'green'}}></td>
                    <td className='palette-color' onClick={this.changeColor} style={{backgroundColor: 'magenta'}}></td>
                    <td className='palette-color' onClick={this.changeColor} style={{backgroundColor: 'cyan'}}></td>
                    <td className='palette-eraser' id='eraser' onClick={this.selectEraser}></td>
                </tr>
            </tbody>
            </table>
            <Chat ref={this.state.chatRef} room={this.state.room} socket={this.state.socket} myName={this.state.myName}/>
            </div>
            </div>) 
    }
}
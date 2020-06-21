import React, { useRef } from 'react'
import Peer from 'simple-peer'
import wrtc from 'wrtc'
import axios from 'axios'
export default class Canvas extends React.Component{
    state = {
        socket: this.props.socket,
        myName: this.props.name,
        room: {name: this.props.match.params.roomName},
        rtcPeers: [],
        lastPos: {},
        remoteLastPos: [],
        canvasRef: React.createRef()
    }
    componentDidMount(){
        axios.get(process.env.NODE_ENV === 'production' && `http://dibujio-server/api/room/${this.props.match.params.roomName}` || `http://localhost:5000/api/room/${this.props.match.params.roomName}`)
            .then( ({data: room}) => {
                this.setState({room}, this.initPeers)
            })
    }
    initPeers = () =>{
        const {room} = {...this.state}
        const rtcPeers = {}
        room.clients.map( client => {
            let newPeer = new Peer({initiator: true, trickle: false, wrtc})
            newPeer.on('signal', data => {this.forwardSignal(JSON.stringify(data), this.state.myName, client.socket)})
            newPeer.on('connect', () => {
                console.log('CONNECT')
                newPeer.send('whatever' + Math.random())
            })
            newPeer.on('data', data => {
                console.log('data: ' + data + client.name)
                this.drawTouchs(JSON.parse(data), 'greenyellow')
            })
            rtcPeers[client.name] = newPeer
        })
        this.state.socket.on('signal', (data, clientName, remoteSocket) => {
            const {rtcPeers} = this.state
            console.log('invefore eif')
            if(rtcPeers[clientName]){
                rtcPeers[clientName].signal(data)
            }
            else{
                let newPeer = new Peer({initiator: false, trickle: false, wrtc})
                newPeer.on('signal', data => {this.forwardSignal(data, this.state.myName, remoteSocket)})
                newPeer.signal(data)
                console.log('signaleeeeeee.....', data)
                newPeer.on('connect', () => {
                    console.log('CONNECT')
                    //newPeer.send('whatever' + Math.random())
                })
                newPeer.on('data', data => {
                    console.log('data: ' + data + clientName)
                    this.drawTouchs(JSON.parse(data), 'greenyellow')
                })
                rtcPeers[clientName] = newPeer
                this.setState({
                    rtcPeers
                })
            }
        })
        this.setState({rtcPeers}, this.initCanvas)
    }
    forwardSignal = (signal, myName, remoteSocket) => {
        console.log('forqwarding')
        const {socket} = this.state
        socket.emit('forward signal', signal, myName, remoteSocket)
    }
    initCanvas = () => {
    }
    touchStart = (evt) => {
        const {pageX: x, pageY: y} = evt.changedTouches[0]
        this.setState({lastPos: {x, y}})
    }
    touchMove = (evt) => {
        const touchs = evt.changedTouches
        const touchsXY = {lastPos: this.state.lastPos, x: touchs[0].pageX, y: touchs[0].pageY}
        this.sendTouchs(JSON.stringify(touchsXY))
        this.drawTouchs(touchsXY)
    }
    drawTouchs = (touchs, color = 'blue') => {
        const myCanvas = this.state.canvasRef.current
        const ctx = myCanvas.getContext('2d')
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
    render(){
        return( 
            <>
            👉check the console 
            <canvas ref={this.state.canvasRef} onTouchMove={this.touchMove} onTouchStart={this.touchStart} onTouchEnd={this.touchEnd} id="myCanvas" style={{border: '1px solid black'}} width='300' height='500'></canvas>
            </>) 
    }
}
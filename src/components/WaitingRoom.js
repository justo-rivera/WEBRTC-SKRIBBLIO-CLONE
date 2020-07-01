import React from 'react'
import { withRouter } from 'react-router-dom'
import Canvas from './Canvas'
class WaitingRoom extends React.Component{
    state = {
        socket: this.props.socket,
        myName: this.props.name,
        roomName: this.props.match.params.roomName,
        loading: true
    }
    handleChange = (e) => {
        const cloneState = {...this.state}
        cloneState[e.target.name] = e.target.value
        this.setState(cloneState)
    }
    socketJoinRoom = () =>{
        const socket = this.state.socket
        const { roomName, myName} = {...this.state}
        socket.emit('join room', {selectedRoom: roomName, clientName: myName, isLeader: false})
    }
    render(){

        if(this.state.loading){
            return(
                <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                <p>Your name:</p>
                <input type="text" name="myName" onChange={this.handleChange}/>
                <button onClick={() => {
                    this.setState({loading: false})
                    this.socketJoinRoom()
                    }}>JOIN</button>
                </div>                
            )
        }
        return <Canvas socket={this.state.socket} name={this.state.myName} match={this.props.match} history={this.props.history} location={this.props.location}/>

    }
}

export default withRouter(WaitingRoom)
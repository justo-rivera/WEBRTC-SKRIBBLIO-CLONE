import React from 'react'
import {Switch, Route, withRouter} from 'react-router-dom'
import io from 'socket.io-client'
import SelectRoom from './components/SelectRoom'
import Canvas from './components/Canvas'

class App extends React.Component {
  state = {
    name: '',
    selectedRoom: '',
    socket: null,
    loading: true,
  }
  componentDidMount(){
    const socket = io.connect(process.env.NODE_ENV === 'production' && 'wss://dibujio-server.herokuapp.com/' || 'http://localhost:5000')
    console.log(process.env)
    this.setState({socket, loading: false})
    socket.on('assigned name', newName=>{
      console.log(newName)
      this.setState({name: newName})
    })
  }
  socketJoinRoom = ( selectedRoom, clientName, isLeader = false ) =>{
    console.log(selectedRoom, clientName, isLeader)
    const socket = this.state.socket
    socket.emit('join room', {selectedRoom, clientName, isLeader})
    socket.on('joined', data => console.log('joined...', data))
    this.setState({name: clientName, selectedRoom}, () => {
    this.props.history.push(`/${selectedRoom}`)})
  }
  render(){
    if(this.state.loading){
      return <>Mega loading,.....................</>
    }
    return (
      <div>
      <Switch>
        <Route exact path={'/'} render={
          () => 
          <SelectRoom socket={this.state.socket} joinCallback={this.socketJoinRoom} />
          }/>
        <Route path={'room/:roomName'} render={
          (router) => 
          <Canvas joinRoom={this.socketJoinRoom} socket={this.state.socket} name={this.state.name} {...router}/>
        }/>
      </Switch>
      </div>
    )
  }
}

export default withRouter(App);

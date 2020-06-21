import React from 'react'
import {Switch, Route, withRouter} from 'react-router-dom'
import io from 'socket.io-client'
import Peer from 'simple-peer'
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
    const socket = io.connect(process.env.WS_HEROKU || 'http://localhost:5000')
    this.setState({socket, loading: false})
  }
  socketJoinRoom = ( selectedRoom, clientName, isLeader = false ) =>{
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
        <Route path={'/:roomName'} render={
          (router) => 
          <Canvas socket={this.state.socket} name={this.state.name} {...router}/>
        }/>
      </Switch>
      </div>
    )
  }
}

export default withRouter(App);

import React from 'react'
import {Switch, Route, withRouter} from 'react-router-dom'
import config from './config'
import io from 'socket.io-client'
import axios from 'axios'
import SelectRoom from './components/SelectRoom'
import WaitingRoom from './components/WaitingRoom'
import SignIn from './components/SignIn'
import SignUp from './components/SignUp'
import './App.css'

class App extends React.Component {
  state = {
    name: '',
    selectedRoom: '',
    socket: null,
    loading: true,
  }
  componentDidMount(){
    const socket = io.connect(process.env.REACT_APP_SOCKET_URL)
    this.setState({socket, loading: false})
    socket.on('assigned name', newName=>{
      console.log(newName)
      this.setState({name: newName})
    })
  }
  socketJoinRoom = ( selectedRoom, clientName, isLeader = false ) =>{
    this.setState({name: clientName, selectedRoom}, () => {
    this.props.history.push(`/room/${selectedRoom}`)})
  }
  handleSignIn = (e) => {
    e.preventDefault();
    let name = e.target.name.value;
    let password = e.target.password.value
    
    axios.post(`${config.REACT_APP_PROFILE_URL}/signin`, {
      name: name,
      password: password
    }, {withCredentials: true})
    .then((res) => {
      this.setState({
        loggedInUser: res.data
      }, () => {
        this.props.history.push('/')
      })
    })
  }
  handleSignUp = (e) => {
    e.preventDefault()
    let name = e.target.name.value;
    let username = e.target.username.value
    let password = e.target.password.value
    axios.post(`${config.REACT_APP_PROFILE_URL}/signup`, {
      name: name,
      username: username,
      password: password
    }, { withCredentials: true})
    .then((res) => {
        this.setState({
          loggedInUser: res.data
        }, () => {
          this.props.history.push('/')
        })
    })
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
        <Route path={'/room/:roomName'} render={
          (router) => 
          <WaitingRoom socket={this.state.socket} name={this.state.name} {...router}/>
        }/>
        <Route path="/sign-in" render={(routeProps) => {
          return <SignIn 
            onSignIn={this.handleSignIn} 
            {...routeProps} 
          />
        }}/>
        <Route path="/sign-up" render={(routeProps) => {
          return <SignUp onSignUp={this.handleSignUp} {...routeProps} />
        }}/>
      </Switch>
      </div>
    )
  }
}

export default withRouter(App);

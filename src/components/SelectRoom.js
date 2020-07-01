import config from '../config'
import React from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
export default class SelectRoom extends React.Component{
    state = {
        rooms: [],
        selectedRoom: '',
        clientName: '',
        loading: true,
    }
    componentDidMount(){
        axios.get(`${config.API_URL}/rooms`)
            .then( ({data: rooms}) => {
                this.setState({rooms: rooms.map( room => room.name), loading: false})
            })
    }
    handleChange = (e) =>{
        let cloneState = {...this.state}
        cloneState[e.target.name] = e.target.value
        this.setState(cloneState)
    }
    joinRoom = (e) =>{
        e.preventDefault()
        const {rooms, selectedRoom, clientName} = this.state
        const isLeader = !rooms || !rooms.includes(selectedRoom)
        this.props.joinCallback( selectedRoom, clientName, isLeader)
    }
    render(){
        if(this.state.loading){
            return <>Loading..........................</>
        }
        return (
            <form onSubmit={this.joinRoom} >
            {this.state.rooms.length > 0 && <p>Rooms:</p> }
            {this.state.rooms.length > 0 || <p>No one is playing, create a room!</p>}
            <ul>
                {
                    this.state.rooms && this.state.rooms.map( room => 
                        <li key={room}><Link to={`/room/${room}`}>{room}</Link></li>
                    )
                }
            </ul>
            <label htmlFor='selectedRoom'>Room name: </label><br/>
            <input onChange={this.handleChange} type='text' name='selectedRoom' id='selectedRoom'/>
            <button type='submit'>Create Room</button>
            </form>
        )
    }
}
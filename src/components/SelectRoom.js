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
            <div>
            <h1 style={{textAlign: 'center', fontSize: '3em'}}>
                <span role="img" aria-label="crayon emoji and happy cowboy emoji">
                🖍️🤠
                </span><br/>
                Pictionar-io
            </h1>
            <div className="homepage">
            <div>
            <form onSubmit={this.joinRoom}>
            <p>
            Create a room</p>
            <p>
                <label htmlFor='selectedRoom'>Room name: </label>
                <input onChange={this.handleChange} type='text' name='selectedRoom' id='selectedRoom'/>
                <p style={{textAlign: 'center'}}>
                <button onClick={this.joinRoom} type='submit'>Create Room</button>
                </p>
            </p>
            </form>
            </div>
            <div>
            {this.state.rooms.length > 0 && <p>Join a room:</p> }
            {this.state.rooms.length > 0 || <p>No one is playing, create a room!</p>}
            <ul style={{listStyleType: 'none'}}>
                {
                    this.state.rooms && this.state.rooms.map( room => 
                        <li key={room}><Link className="white-link" to={`/room/${room}`}>{room}</Link></li>
                    )
                }
            </ul>
            </div>
            </div>
            </div>
        )
    }
}
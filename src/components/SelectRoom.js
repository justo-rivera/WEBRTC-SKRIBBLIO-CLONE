import React from 'react'
import axios from 'axios'
export default class SelectRoom extends React.Component{
    state = {
        rooms: [],
        selectedRoom: '',
        clientName: '',
        loading: true,
    }
    componentDidMount(){
        axios.get((process.env.SERVER_HEROKU || 'http://localhost:5000') + '/api/rooms')
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
            <p>Rooms:</p>
            <ul>
                {
                    this.state.rooms && this.state.rooms.map( room => 
                        <li key={room}>{room}</li>
                    )
                }
            </ul>
            <label htmlFor='selectedRoom'>room: </label>
            <input onChange={this.handleChange} type='text' name='selectedRoom' id='selectedRoom'/>
            <label htmlFor='clientName'>your name:</label>
            <input onChange={this.handleChange} type='text' name='clientName' id='clientName'/>
            <button type='submit'>join</button>
            </form>
        )
    }
}
import React from 'react'
export default class Chat extends React.Component{
    state = {
        myName: this.props.myName,
        room: this.props.room,
        socket: this.props.socket,
        messages: []
    }
    componentDidMount(){
        const socket = this.state.socket
        const cloneMessages = this.state.messages
        socket.on('message', (name, message) => {
            cloneMessages.unshift({name, message, type: 'message'})
            this.setState({messages: cloneMessages})
        })
        socket.on('correct guess', name => {
            cloneMessages.unshift({name, message: `${name} guessed the word`, type: 'guess'})
            this.setState({messages: cloneMessages})
        })
    }
    sendMessage = (e) => {
        e.preventDefault()
        const {socket} = this.state
        socket.emit('message', this.state.inputMessage)
        e.target.inputMessage.value = ''
    }
    handleChange = (e) => {
        e.preventDefault()
        this.setState({inputMessage: e.target.value})
    }
    render(){
        return(
        <>
        <form onSubmit={this.sendMessage}>
        <input type="text" name="inputMessage" onChange={this.handleChange} placeholder="type your guess here..."/>
        </form>
        <div className="chat">
        {
            this.state.messages.map((message,i) => {
                if(message.type === 'guess') return <p key={'message-'+i}>{message.name} guessed the word!</p>
                return <p key={'message-'+i}>{message.name}: {message.message}</p>
            })
        }
        </div>
        </>)
    }
}
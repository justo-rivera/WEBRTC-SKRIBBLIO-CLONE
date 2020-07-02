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
        setTimeout(this.changeChatStyle, 0)
        window.addEventListener('resize', this.changeChatStyle)
        socket.on('message', (name, message) => {
        const cloneMessages = [...this.state.messages]
            cloneMessages.unshift({name, message, type: 'message'})
            this.setState({messages: cloneMessages})
        })
        socket.on('correct guess', name => {
            const cloneMessages = [...this.state.messages]
            cloneMessages.unshift({name, type: 'guess'})
            this.setState({messages: cloneMessages})
        })
        socket.on('new client', name => {
            console.log('new client')
            const cloneMessages = [...this.state.messages]
            cloneMessages.unshift({name, type: 'new client'})
            this.setState({messages: cloneMessages})
        })
        socket.on('client left', name => {
            const cloneMessages = [...this.state.messages]
            cloneMessages.unshift({name, type: 'client left'})
            this.setState({messages: cloneMessages})
        })
    }
    sendMessage = (e) => {
        e.preventDefault()
        const {socket} = this.state
        socket.emit('message', this.state.inputMessage)
        e.target.inputMessage.value = ''
    }
    changeChatStyle = () => {
        const chat = document.getElementById('chat')
        console.log(window.screen.width)
        if(window.screen.height <= window.screen.width){ //Desktop
            /* to be changed */
            chat.style.maxHeight = window.innerHeight * 0.12 + 'px'
            chat.style.overflowY = 'scroll'
        }
        else{
            chat.style.maxHeight = window.innerHeight * 0.14 + 'px'
            chat.style.overflowY = 'scroll'
        }
    }
    handleChange = (e) => {
        e.preventDefault()
        this.setState({inputMessage: e.target.value})
    }
    render(){
        return(
        <div id="chat-container">
        <form onSubmit={this.sendMessage}>
        <input type="text" name="inputMessage" onChange={this.handleChange} placeholder="type your guess here..."/>
        </form>
        <div id="chat" className="chat">
        {
            this.state.messages.map((message,i) => {
                if(message.type === 'guess') return <p key={'message-'+i} style={{color: 'greenyellow'}}><b>{message.name}</b> guessed the word!</p>
                if(message.type === 'new client') return <p key={'message-'+i} style={{color: 'white'}}>{message.name} joined the room!</p>
                if(message.type === 'client left') return <p key={'message-'+i} style={{color: 'white'}}>{message.name} left the room</p>
                return <p key={'message-'+i}>{message.name}: {message.message}</p>
            })
        }
        </div>
        </div>)
    }
}
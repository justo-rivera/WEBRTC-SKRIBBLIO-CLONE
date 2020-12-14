## DRAW & GUESS

# [PICTIONAR-IO.HEROKUAPP.COM](PICTIONAR-IO.HEROKUAPP.COM)
  
  
  
   
### how

A user creates a room and shares the link with their friends. Every 30 seconds a leader of the room is chosen, he selects a word and has the ability to draw on the canvas. What he draws is seen by the rest of the room, they can use the chat to try to guess the word.


### Routes

- / - List of public rooms (Homepage)
- /auth/signup - Signup form
- /auth/login - Login form
- /ROOM-NAME - Join 'ROOM-NAME' room
- /new - Create a new room
- /profile/me - my details and past games
- 404

### Components

- Room 
    - Join a room, connect to the peers
    - Children: Canvas, Chat
- Canvas
    - Draw and display peers' drawings
    - Main feature of the project
- Chat
    - Communicate with your room

## IO


### Services

- Auth Service
  - auth.login(user)
  - auth.signup(user)
  - auth.logout()
  - auth.me()
  - auth.getUser() // synchronous
- Socket/Room Service
  - room.start()
  - room.create(room-name)
  - room.changeLeader(room-name)
  - room.save(room-name)

## SERVER (WebRTC)

github.com/justo-rivera/WEBRTC-SKRIBBLIO-CLONE-SERVER
  
  
  
  
#### Models

User model

```
username - String // required
email - String // required & unique
password - String // required
pastGames - [ObjectID<Game>]
```

Game model

```
snapshots - [{imageUrl, word, drawedBy}]
```

Client model

```
name - String
room - ObjectID<Room>
socket - String
user - ObjectID<User>
```

Room model

``` 
name - String
isPlaying - Boolean
clients - [ObjectID<Client>]
leader - [ObjectID<Client>]
```

## API Endpoints/Backend Routes

- GET /auth/me
- POST /auth/signup
  - body:
    - username
    - email
    - password
- POST /auth/login
  - body:
    - username
    - password
- POST /auth/logout
  - body: (empty)
- GET /:room-name
  - body:
    - who is drawing
    - time left
    - canvas
    - chat
- GET /
  - body:
    - room list
    - create a room

  



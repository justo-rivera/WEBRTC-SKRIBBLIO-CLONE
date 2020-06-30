import React from 'react';
import 'bootstrap/dist/css/bootstrap.css'

export default function SignIn(props){
    return (
        <form onSubmit={props.onSignIn}>
            <div className="form-group">
                <label htmlFor="exampleInputName">Your name</label>
                <input type="text" className="form-control" id="exampleInputName" name="name" aria-describedby="emailHelp" />
            </div>
            <div className="form-group">
                <label htmlFor="exampleInputPassword1">Password</label>
                <input name="password" type="password" className="form-control" id="exampleInputPassword1" />
            </div>
            <button type="submit" className="btn btn-primary">Submit</button>
        </form>
    )
}
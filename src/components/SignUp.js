import React from 'react';
import 'bootstrap/dist/css/bootstrap.css'

export default function SignUp(props){
    return (
        <form onSubmit={props.onSignUp}>
            <div className="form-group">
                <label htmlFor="exampleInputEmail1">Username</label>
                <input type="text" className="form-control" id="exampleInputEmail1" name="namr" aria-describedby="emailHelp" />
            </div>
            <div className="form-group">
                <label htmlFor="exampleInputPassword1">Password</label>
                <input name="password" type="password" className="form-control" id="exampleInputPassword1" />
            </div>
            <button type="submit" className="btn btn-primary">Submit</button>
        </form>
    )
}
import React, { useEffect, useRef, useState } from "react";
import socketio from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";

const Container = styled.div`
    padding: 20px;
    display: flex;
    width: 90%;
    margin: auto;
    flex-wrap: wrap;
`;

const Container2 = styled.div`
    display: flex;
    flex-direction: column;
    width: 90%;
    margin: auto;
`;

const Button = styled.button`
    width: 200px;
    padding: 20px;
    background-color: red;
    color: white;
    outline: none;
    border: none;
    border-radius: 5px;
    cursor: pointer;
`;

const StyledVideo = styled.video`
    height: 40%;
    width: 50%;
`;

const Video = (props) => {
    const ref = useRef();

    useEffect(() => {
        if (props.peer.on){
            props.peer.on("stream", stream => {
                ref.current.srcObject = stream;
            })
        }
    }, [props.peer]);

    return (
        <StyledVideo playsInline autoPlay ref={ref} />
    );
}


const videoConstraints = {
    height: window.innerHeight / 2,
    width: window.innerWidth / 2
};

const Room = (props) => {
    const [peers, setPeers] = useState([]);
    const socketRef = useRef();
    const userVideo = useRef();
    const peersRef = useRef([]);
    const roomId = props.match.params.roomID;

    useEffect(() => {
        socketRef.current = socketio.connect("https://intense-sands-06168.herokuapp.com/", {
            withCredentials: false
        });
        navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: true }).then(stream => {
            userVideo.current.srcObject = stream;
            socketRef.current.emit('join room', roomId);
            socketRef.current.on('all users', users => {
               const peers = []
               users.forEach(userId => {
                   const peer = createPeer(userId, socketRef.current.id, stream);
                   peersRef.current.push({
                       peerId: userId,
                       peer,
                   })
                   peers.push(peer);
               })
               setPeers(peers);
            });

            socketRef.current.on("user joined", payload => {
                const peer = addPeer(payload.signal, payload.callerId, stream);
                peersRef.current.push({
                    peerId: payload.callerId,
                    peer,
                });

                setPeers(users => [...users, peer])
            })
        })
        socketRef.current.on('receiving returned signal', payload => {
            const item = peersRef.current.find(p => p.peerId === payload.id);
            item.peer.signal(payload.signal);
        })

        socketRef.current.on('user left', payload => {
            console.log(`User ${payload.userLeaving} disconnected`)
            //peersRef.current.filter(p => p.peerId !== payload.leavingUser)
            const leavingPeer = peersRef.current.find(p => p.peerId === payload.userLeaving);
            leavingPeer.peer.destroy();
            peersRef.current = peersRef.current.filter(p => p.peerId !== payload.userLeaving);
            setPeers(payload.room);
        })
    }, [roomId]);

    function createPeer(userToSignal, callerId, stream) {
       const peer = new Peer({
           initiator: true,
           trickle: false,
           stream
       });

       peer.on('signal', signal => {
           socketRef.current.emit("sending signal", { userToSignal, callerId, signal })
       })

       return peer;
    }

    function addPeer(incomingSignal, callerId, stream) {
       const peer = new Peer({
           initiator: false,
           trickle: false,
           stream
       });

       peer.on('signal', signal => {
           socketRef.current.emit('returning signal', { signal, callerId })
       })

       peer.signal(incomingSignal);

       return peer;
    }

    const onLeaveCall = () => {
        //setPeers([])
        socketRef.current.emit('user disconnect')
        props.history.push('/');
    }

    return (
        <Container2>
            <Container>
                <StyledVideo muted ref={userVideo} autoPlay playsInline />
                {peers.map((peer, index) => {
                    return (
                        <Video key={index} peer={peer} />
                    );
                })}


            </Container>
            <Button
                onClick={onLeaveCall}
            >
                Leave call
            </Button>
        </Container2>

    );
};

export default Room;

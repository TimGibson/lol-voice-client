import React, { useEffect, useRef, useState } from "react";
import socketio from "socket.io-client";
import Peer from "simple-peer";
import Video from '../components/Video';
import styles from './room.module.css';
import styles2 from '../components/video.module.css';

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
        socketRef.current.emit('user disconnect')
        props.history.push('/');
    }

    return (
        <div className={styles.mainContainer}>
            <div className={styles.contentContainer}>
                <div className={styles.roomTitle}>TimGibson's Room</div>
                <div className={styles.videoContainer}>
                    <video className={styles2.video} muted ref={userVideo} autoPlay playsInline />
                    {peers.map((peer, index) => {
                        return (
                            <Video key={index} peer={peer} />
                        );
                    })}
                </div>
                <div className={styles.controls}>
                    <button
                        className={styles.leaveButton}
                        onClick={onLeaveCall}
                    >
                        End Call
                    </button>
                </div>

            </div>
        </div>

    );
};

export default Room;

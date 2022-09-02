import React, { Component } from "react";
import { FiLinkedin, FiGithub, FiTwitter, FiInstagram, FiHeadphones } from "react-icons/fi";

export class Links extends Component {
    render() {
        return(
            <div className="w-full flex flex-col grow justify-start">
                <div className="py-12 flex justify-center">
                    <a href="https://www.linkedin.com/in/worthy-rae-4a21a41812" target="_blank" rel="noopener noreferrer">
                        <FiLinkedin className="w-10 h-10 stroke-1 hover:stroke-2"/>
                    </a>
                </div>
                <div className="py-12 flex justify-center">
                    <a href="https://github.com/worthybrae" target="_blank" rel="noopener noreferrer">
                        <FiGithub className="w-10 h-10 stroke-1 hover:stroke-2"/>
                    </a>
                </div>
                <div className="py-12 flex justify-center">
                    <a href="https://twitter.com/W0RTHYRAE" target="_blank" rel="noopener noreferrer">
                        <FiTwitter className="w-10 h-10 stroke-1 hover:stroke-2"/>
                    </a>
                </div>
                <div className="py-12 flex justify-center">
                    <a href="https://www.instagram.com/worthybrae/?hl=en" target="_blank" rel="noopener noreferrer">
                        <FiInstagram className="w-10 h-10 stroke-1 hover:stroke-2"/>
                    </a>
                </div>
                <div className="py-12 flex justify-center">
                    <a href="https://open.spotify.com/user/1225056983" target="_blank" rel="noopener noreferrer">
                        <FiHeadphones className="w-10 h-10 stroke-1 hover:stroke-2"/>
                    </a>
                </div>
            </div>
        )
    }
}
export default Links;
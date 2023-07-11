import axios from "axios";
import nodemailer from "nodemailer"
import {google} from "googleapis";

import dotenv from "dotenv";

dotenv.config();

const generateConfig = (url, accessToken, method) => {
    return {
        method: method,
        url: url,
        headers: {
            Authorization: `Bearer ${accessToken} `,
            "Content-type": "application/json",
        },
    };
};

const authenticationDetails = {
    type: "OAuth2",
    user: "<insert_your_email_id>",
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
};


const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

function randomNumber(min, max) {
    return Math.random() * (max - min) + min;
}
export function start(res, req){
    console.log("Started.....")
    setInterval(main, randomNumber(45000, 120000));
}
export async function main(){
    const { token } = await oAuth2Client.getAccessToken();
    let allMessageIDs = await getAllMessagesId(token)
    let sentMessageIDs = await getSentMessagesId(token)
    const unsentIDs = unsentIds(allMessageIDs, sentMessageIDs)
    const emails = []
    const results = []
    let norelyReg = new RegExp(/(?:noreply|no-reply|-noreply)/) //This regex is used  to identify no-reply emails
    for(let i = 0; i<unsentIDs.length; i++){
        if(unsentIDs.length===0){break}
        let email = await getEmail(token, unsentIDs[i][0])
        let test = norelyReg.test(email[0])
        if(test){
            continue
        }
        emails.push(email)
    }

    for(let i=0; i<emails.length; i++){
        if(unsentIDs.length===0){break}
        let result = await sendMail(token, emails[i]);
        results.push(result)
    }
    console.log(results)
}

async function getAllMessagesId(token){
    try{
        const url = `https://gmail.googleapis.com/gmail/v1/users/<insert_your_email_id>/messages`
        const config = generateConfig(url, token, "get");
        const response = await axios(config);
        let data = await response.data;
        let messageIDs = [];
        data.messages.forEach(item => {
            let temp = [item.id, item.threadId];
            messageIDs.push(temp);
        })

        return messageIDs;

    }catch (error){
        console.log(error);
    }
}

async function getSentMessagesId( token){
    try{
        const url = `https://gmail.googleapis.com/gmail/v1/users/<insert_your_email_id>/messages?q=label:sent`
        const config = generateConfig(url, token, "get");
        const response = await axios(config);
        let data = await response.data;
        let messageIDs = []
        if(data.messages == undefined){
            return null;
        }
            data.messages.forEach(item => {
                let temp = [item.id, item.threadId]
                messageIDs.push(temp)
            })



        return messageIDs

    }catch (error){
        console.log(error);
    }
}

function unsentIds(allMessagesId, sentMessagesId){
    let unsentIds = [];
    let flag = 0;
    if(sentMessagesId == null){
        return allMessagesId;
    }
    for(let i=0; i<allMessagesId.length; i++){
        flag = 0;
        for(let j=0; j<sentMessagesId.length; j++){
            if(allMessagesId[i][1] === sentMessagesId[j][1]){
                flag = 1;
                break;
            }
        }
        if(!flag){
            unsentIds.push(allMessagesId[i]);
        }
    }

    return unsentIds;
}

async function getEmail(token, messageId){
    try{
        const url = `https://gmail.googleapis.com/gmail/v1/users/<insert_your_email_id>/messages/${messageId}`;
        const config = generateConfig(url, token, "get");
        const response = await axios(config);
        let data = await response.data;
        let headers = data.payload.headers;
        let email = ''
        const emailReg = new RegExp(/<([^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)>/);
        let MessageId = ''
        let subject = ''
        headers.forEach(item => {
            if (item.name === "From") {
                let match = item.value.match(emailReg);
                if (match) {
                    email = match[1];

                }
            }
            if (item.name === "Message-Id") {
                MessageId = item.value;
            }
            if (item.name === "Subject") {
                 subject = item.value;
            }
        })
        return [email, MessageId, subject, messageId];
    }
    catch (error) {
        console.log(error);
    }

}

async function sendMail(token, email){
    const transport = nodemailer.createTransport({
        service: "gmail",
        auth: {
            ...authenticationDetails,
            accessToken: token,
        },
    });

    const mailOptions = {
        from: "Vikram Mali <<insert_your_email_id>>",
        to: email[0],
        inReplyTo: email[1],
        references: email[1],
        subject: "Re:" + email[2],
        text: "The Gmail API with NodeJS works perfectly",
    };
    const result = await transport.sendMail(mailOptions);
    return result

}



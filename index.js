const { ApolloServer, gql } = require('apollo-server');
const axios = require('axios');
var admin = require("firebase-admin");


var serviceAccount = require("./solvee-intern-8b67252d5b2f.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

//Get Firestore DB instance from Firebase
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true })

//GQL types and mutations
const typeDefs = gql`
  
    type User {
        id: ID!
        name: String!
        accounts: [Account]
    }

    type Account {
        userID: ID!
        bank: String!
        branch: String!
        address: String!
        city: String!
        district: String!
        state: String!
        bank_code: String!  
        ifsc: String!
        weather: Weather!
    }

    type Weather {
        temp: Float
        humidity: Float
    }
    
    type Mutation {
        #mutationt to create/update a user with ID, name and IFSC as input
        addAccountDetails(userID: ID!, userName: String!, accounts: [String]!): User
    }

    type Query {
        users: [User]
    }
    `;

const resolvers = {
    Query: {
        async users() {
            const accounts = await db.collection('User').get();
            return accounts.docs.map(account => account.data());
        },
    },
    User: {},
    Account: {},
    Weather: {},
    Mutation: {
        addAccountDetails: async (_, {userID, userName, accounts}) => {
            //Adding or Updating User on DB
            let user = await db.collection('User').where('id', '==', userID).get();
            if (!user.empty) { 
                console.log(user.docs[0].data())
                await db.collection('User').doc(user.docs[0].id).update({
                    id: userID,
                    name: userName
                })
            }
            else {
                db.collection('User').doc(userID).set({
                    id: userID,
                    name: userName
                })
            }
            user = await db.collection('User').where('id', '==', userID).get();
            details = user.docs[0].data(); 
            //Add bank data from IFSC endpoint
            let userAccounts = []
            for (x in accounts) {
                let response = await axios.get(`https://ifsc.razorpay.com/${accounts[x]}`);
                let res = response.data;
                let myObj = {};
                myObj.bank = res.BANK;
                myObj.branch = res.BRANCH
                myObj.address = res.ADDRESS;
                myObj.city = res.CITY;
                myObj.district = res.DISTRICT;
                myObj.state = res.STATE;
                myObj.bank_code = res.BANKCODE;
                myObj.ifsc = accounts[x];
                myObj.userID = userID;
                myObj.weather = {};
                userAccounts = [...userAccounts, myObj];
            }
            details.accounts = userAccounts;
            var key = require('./api-keys.json')['API_KEY'];
            for (i in details.accounts) {
                let myObj = details.accounts[i];
                let city = myObj.city;
                let weatherResponse = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city},IN&appid=${key}`);
                let data = weatherResponse.data.main;
                let weather = {};
                weather.temp = data.temp;
                weather.humidity = data.humidity;
                console.log(weather);
                myObj.weather = weather;
            }
            console.log(details);
            return details;
        }
    }
};

const server = new ApolloServer({
    typeDefs,
    resolvers
});

server.listen().then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
});
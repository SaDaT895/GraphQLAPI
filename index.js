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

//Helper Functions
const getProps = (props,obj) => {
    return props.reduce((result, key) => ({
        ...result,
        [key.toLowerCase()]: obj[key]
    }), {});
}


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
        bankcode: String!  
        ifsc: String!
        weather: Weather!
    }

    type Weather {
        temp: Float
        humidity: Float
        ifsc: String
    }
    
    type Mutation {
        #mutationt to create/update a user with ID, name and IFSC as input
        addAccountDetails(userID: ID!, userName: String!, accounts: [String]!): User
    }

    type Query {
        user(id: ID!): User
    }
    `;

const resolvers = {
    Query: {
        user: async(_, {id}) => {
            let user = await db.collection('User').doc(id).get();
            let accounts = await db.collection('Account').where('userID','==',id).get();
            let res = accounts.docs.map(x => x.data());
            for(i in res) {
                let temp = res[i];
                let data = await db.collection('Weather').doc(temp.ifsc).get()
                res[i] = {...temp,'weather': data.data()}
            }
            console.log(res);
            return {...user.data(),'accounts': res };
        },
    },
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
                let myObj = getProps(['BANK', 'BRANCH', 'ADDRESS', 'CITY', 'DISTRICT', 'STATE', 'BANKCODE', 'IFSC'],res);   
                myObj.userID = userID;
                await db.collection('Account').doc(userID + accounts[x]).set(myObj);
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
                myObj.weather = getProps(['temp', 'humidity'], data);
                myObj.weather.ifsc =  myObj.ifsc;
                await db.collection('Weather').doc(myObj.ifsc).set(myObj.weather);
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
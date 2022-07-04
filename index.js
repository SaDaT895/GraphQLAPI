const { ApolloServer, gql } = require('apollo-server');
var admin = require("firebase-admin");

var serviceAccount = require("./solvee-intern-8b67252d5b2f.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true })

const typeDefs = gql`
  
    type User {
        id: ID
        name: String
        accounts: [Account]
    }

    type Account {
        userID: User!
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
        temp: Int
        humidity: Int
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
            res = user.docs[0].data(); 
            //Add bank data from IFSC endpoint
            
            console.log(res);
            return res;
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
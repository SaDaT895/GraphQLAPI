import { ApolloServer, gql } from 'apollo-server';

const schema = gql`
    type Mutation {
        #mutationt to create/update a user with ID, name and IFSC as input
        addAccountDetails(id: ID!, name: String!, accounts: [ifsc]!): User
    }
    
    type User {
        id: ID!
        name: String!
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
    }`

    
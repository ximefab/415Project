const express = require('express')
const app = express()
const fs = require('fs');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
const path = require('path');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');


//app.get/post and /update link the html forms to the route /post and /update

app.get('/Post', function(req, res) {
  res.sendFile(path.join(__dirname + '/first.html'));
  
});

app.get('/Update', function(req, res) {
  res.sendFile(path.join(__dirname + '/second.html'));
  
});


// const Ticket = require('../models/ticket');

const uri = 'mongodb+srv://User1:CxA5WyB3MGfxyrQ8@ximfab415.pisguor.mongodb.net/';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db('ximfab415');
    return db;
  } catch (error) {
    console.error(error);
  }
}

const dbPromise = connectToDatabase();


//Here you get the ticket list
app.get('/rest/list', async (req, res) => {
  try {
    const db = await dbPromise;
    const collection = db.collection('415');
    const tickets = await collection.find().toArray();
    if (tickets.length === 0) {
      return res.status(404).send('There are no tickets!');
    }
    console.log(tickets);
    res.send(tickets);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

//here you get a ticket by id from the mongodb!
app.get('/rest/ticket/:id', async (req, res) => {
  try {
    const db = await dbPromise;
    const collection = db.collection('415');
    const ticket = await collection.findOne({ _id: Number(req.params.id) });
    if (!ticket) {
      return res.status(404).send('Ticket not found. Make sure you put the right id number!');
    }
    console.log(ticket);
    res.send(ticket);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

//here you delete a ticket from the db!
app.delete('/rest/ticket/:id', async (req, res) => {
  try {
    const db = await dbPromise;
    const collection = db.collection('415');
    const result = await collection.deleteOne({ _id: Number(req.params.id) });

    if (result.deletedCount === 0) {
      return res.status(404).send('Ticket not found');
    }

    console.log('Ticket deleted successfully');
    res.sendStatus(204);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});


//Post API to make a new ticket
app.use(express.json());
const ticketSchema = new mongoose.Schema({
  _id: Number,
  type: String,
  subject: String,
  description: String,
  priority: String,
  status: String,
  recipient: String,
  submitter: String,
  assignee_id: Number,
  follower_ids: [Number]
}, { timestamps: true });

// Create the Ticket model using the schema
const Ticket = mongoose.model('Ticket', ticketSchema);

// Create a new ticket and save it to the database
app.post('/rest/maketicket', async (req, res) => {
  const { id, type, subject, description, priority, status, recipient, submitter, assignee_id, follower_ids } = req.body;

  // Error checking for missing fields
  if (!subject || !type || !description || !priority || !status || !recipient || !submitter) {
    return res.status(400).send('Missing required fields');
  }

  // Create a new ticket object using the request body
  const newTicket = {
    _id: parseInt(id),
    type,
    subject,
    description,
    priority,
    status,
    recipient,
    submitter,
    assignee_id,
    follower_ids,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Insert the new ticket into the database
  try {
    const db = await dbPromise;
    const collection = db.collection('415');
    await collection.insertOne(newTicket);
    res.status(201).send(newTicket);
  } catch (err) {
    res.status(500).send(`Error creating ticket: ${err}`);
  }
});

//update tickets!
app.put('/rest/ticket/:id', async (req, res) => {
  try {
    const db = await dbPromise;
    const collection = db.collection('415');

    // Find the existing ticket by ID
    const existingTicket = await collection.findOne({ _id: Number(req.params.id) });

    // If the ticket doesn't exist, return 404 error
    if (!existingTicket) {
      return res.status(404).send('Ticket not found. Make sure you put the right id number!');
    }

    // Replace the existing ticket with the new ticket object from the request body
    const { type, subject, description, priority, status, recipient, submitter, assignee_id, follower_ids } = req.body;
    const updatedTicket = {
      _id: existingTicket._id,
      type: type || existingTicket.type,
      subject: subject || existingTicket.subject,
      description: description || existingTicket.description,
      priority: priority || existingTicket.priority,
      status: status || existingTicket.status,
      recipient: recipient || existingTicket.recipient,
      submitter: submitter || existingTicket.submitter,
      assignee_id: assignee_id || existingTicket.assignee_id,
      follower_ids: follower_ids || existingTicket.follower_ids,
      createdAt: existingTicket.createdAt,
      updatedAt: new Date(),
    };
    const result = await collection.replaceOne({ _id: Number(req.params.id) }, updatedTicket);

    // If the ticket was successfully replaced, return the updated ticket object
    if (result.modifiedCount === 1) {
      console.log('Ticket replaced successfully');
      res.send(updatedTicket);
    } else {
      res.status(500).send('Error replacing ticket');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});


app.listen(3000, ()=>{
    console.log(`Node API app is running on port 3000`)

})





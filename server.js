const express = require('express')
const app = express()
const fs = require('fs');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
const path = require('path');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const axios = require('axios');

//app.get/post and /update link the html forms to the route /post and /update

app.get('/Post', function(req, res) {
  res.sendFile(path.join(__dirname + '/first.html'));
  
});

app.get('/Update', function(req, res) {
  res.sendFile(path.join(__dirname + '/second.html'));
  
});

app.get("/", (req, res) => {
  res.json({ message: "Welcome! To post, go to /post. To update or delete a ticket go to /update. To view a ticket as XML format go to /rest/xml/ticket/{id}" });
});


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





class TicketAdapter {
  // Converts JSON to XML
  toXML(ticket) {
    const xml = `
      <ticket>
        <id>${ticket._id}</id>
        <type>${ticket.type}</type>
        <subject>${ticket.subject}</subject>
        <description>${ticket.description}</description>
        <priority>${ticket.priority}</priority>
        <status>${ticket.status}</status>
        <recipient>${ticket.recipient}</recipient>
        <submitter>${ticket.submitter}</submitter>
        <assignee_id>${ticket.assignee_id}</assignee_id>
        <follower_ids>${ticket.follower_ids}</follower_ids>
        <createdAt>${ticket.createdAt}</createdAt>
        <updatedAt>${ticket.updatedAt}</updatedAt>
      </ticket>
    `;
    return xml;
  }

  // Converts XML to JSON
toJSON(ticket) {
  var obj = {

    _id: ticket.id,
    type: ticket.type,
    subject: ticket.subject,
    description: ticket.description,
    priority: ticket.priority,
    status: ticket.status,
    recipient: ticket.recipient,
    submitter: ticket.submitter,
    assignee_id: ticket.assignee_id,
    follower_ids: ticket.follower_ids,
    createdAt: ticket.createdAt,
    updatedAt: ticket.UpdatedAt
  };



  return obj;
}
}

const ticketAdapter = new TicketAdapter();

app.get('/rest/xml/ticket/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const response = await axios.get(`http://localhost:3000/rest/ticket/${id}`);
    const ticket = response.data;

    // Convert JSON to XML using the adapter
    const xml = ticketAdapter.toXML(ticket);

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});



app.put('/rest/xml/ticket/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const xmlData = req.body;

    // Convert XML to JSON using the adapter
    const jsonData = ticketAdapter.toJSON(xmlData);

    const db = await dbPromise;
    const collection = db.collection('415');

    // Check if the ticket with the given id already exists
    const existingTicket = await collection.findOne({ _id: Number(id) });
    if (existingTicket) {
      return res.status(409).send('Ticket already exists with the given id!');
    }

    // Add the new ticket to the collection
    await collection.insertOne({
      _id: Number(id),
      type: jsonData.type,
      subject: jsonData.subject,
      description: jsonData.description,
      priority: jsonData.priority,
      status: jsonData.status,
      recipient: jsonData.recipient,
      submitter: jsonData.submitter,
      assignee_id: jsonData.assignee_id,
      follower_ids: jsonData.follower_ids,
      createdAt: new Date(jsonData.createdAt),
      updatedAt: new Date(jsonData.updatedAt)
    });

    // Fetch the added ticket using the existing endpoint
    const response = await axios.get(`http://localhost:3000/rest/ticket/${id}`);
    //comment test
    const ticket = response.data;

    // Convert JSON to XML using the adapter
    const xml = ticketAdapter.toXML(ticket);

    res.set('Content-Type', 'application/xml');
    res.send(xml);
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

  //somethin
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





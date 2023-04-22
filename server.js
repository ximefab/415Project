const express = require('express')
const app = express()
const fs = require('fs');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
const path = require('path');


app.get('/Post', function(req, res) {
  res.sendFile(path.join(__dirname + '/first.html'));
  
});

app.get('/Update', function(req, res) {
  res.sendFile(path.join(__dirname + '/second.html'));
  
});


// read the content/data of tickets.json file
const ticketsData = fs.readFileSync('./tickets.json');

// parse JSON data
const tickets = JSON.parse(ticketsData);


// Get APIs
// Api to get a list of the tickets
app.get('/rest/list/', (req, res) => {
    //error check, if json file is empty then the text "there are no tickets" gets returned to the console.
    if (tickets.length === 0) {
        return res.status(404).send("There are no tickets!");
      }

    // send tickets data
    console.log(tickets);
    res.send(tickets);
})

//Api to get a single ticket
app.get('/rest/ticket/:id', (req, res) => {
    //method to find the ticket based on the id 
    const ticket = tickets.find((x) => x.id === Number(req.params.id));

    //If the input id does not exist, "ticket not found" is printed to the console
    if (!ticket) {
        return res.status(404).send("Ticket not found. Make sure you put the right id number!");
    }

    //send single ticket data
    console.log(ticket) 
    res.send(ticket);
})


//Post API to make a new ticket
app.use(express.json());
app.post('/rest/maketicket', (req, res) => {
    const { id, type, subject, description, priority, status, recipient, submitter, assignee_id, follower_ids, tags } = req.body;
    
    //Error checking for invalid subject, description, priority, status, recipient, submitter, or tags missing. 
    if (!subject) {
      return res.status(400).send("Error! Missing subject field.");
    }
    if (!type) {
      return res.status(400).send("Error! Missing type field.");
    }
    if (!description) {
      return res.status(400).send("Error! Missing description field.");
    }
    if (!priority) {
      return res.status(400).send("Error! Missing priority field.");
    }
    if (!status) {
      return res.status(400).send("Error! Missing status field.");
    }
    if (!recipient) {
      return res.status(400).send("Error! Missing recipient field.");
    }
    if (!submitter) {
      return res.status(400).send("Error! Missing submitter field.");
    }

    
      //Error checking to make sure the assignee and follower dont have duplicating ids, sends prompt that the id already exist if thats the case for either of them
    const existingAssignee = tickets.find(ticket => ticket.assignee_id === assignee_id);
    const existingFollower = tickets.find(ticket => ticket.follower_ids.includes(follower_ids));
    if (existingAssignee || existingFollower) {
        return res.status(400).send('Error! Assignee or follower Id already exists.');
    }

    //sets the id to whatever number is input, if it is null, then it just makes the id the length + 1, but if the id already exists it does not let user add that as id

    let newId;
    
    if (!id || id==null) {
      newId = tickets.length + 1;
    } else {
      newId = Number(id);
      const ticketWithSameId = tickets.find((ticket) => ticket.id === newId);
      if (ticketWithSameId) {
        return res.status(409).send("A ticket with the same id already exists! Choose a new id number. ");
      }
    }
    
    //setting variables etc
    const newTicket = {
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      type: type,
      subject: subject,
      description: description,
      priority: priority,
      status: status,
      recipient: recipient,
      submitter: submitter,
      assignee_id: assignee_id,
      follower_ids: follower_ids,
      tags: tags
    };
    
    //pushes tickets into newTicket
    tickets.push(newTicket);
    
    // write the updated tickets array into the tickets.json file
    fs.writeFileSync('./tickets.json', JSON.stringify(tickets, null, 2));
    
    //return the status in postman
    res.status(201).json(newTicket);
  });

  // DELETE API to delete a single ticket by ID
app.delete('/rest/ticket/:id', (req, res) => {
  // Find the index of the ticket with the given ID
  const index = tickets.findIndex((ticket) => ticket.id === Number(req.params.id));

  // If no ticket is found with the given ID, return a 404 error
  if (index === -1) {
    return res.status(404).send('Ticket not found');
  }

  // Remove the ticket from the tickets array
  const deletedTicket = tickets.splice(index, 1)[0];

  // Write the updated tickets array into the tickets.json file
  fs.writeFileSync('./tickets.json', JSON.stringify(tickets, null, 2));

  // Print "Deleted successfully!" to the console
  console.log("Deleted successfully!");

  // Return the deleted ticket as JSON
  res.status(200).json(deletedTicket);
});



// PUT API to update a single ticket by ID
app.put('/rest/ticket/:id', (req, res) => {
  const index = tickets.findIndex((ticket) => ticket.id === Number(req.params.id));

  // If no ticket is found with the given ID, return a 404 error
  if (index === -1) {
    return res.status(404).send('Ticket not found');
  }

  // Replace the ticket with the updated ticket
  const updatedTicket = { ...tickets[index], ...req.body };
  tickets[index] = updatedTicket;


  fs.writeFileSync('./tickets.json', JSON.stringify(tickets, null, 2));
  res.status(200).json(updatedTicket);
});

app.listen(3000, ()=>{
    console.log(`Node API app is running on port 3000`)

})





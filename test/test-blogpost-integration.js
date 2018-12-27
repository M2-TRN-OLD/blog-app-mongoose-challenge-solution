'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require ('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogPostData() {
    console.info('seeding blogpost data');
    const seedData = [];

    for (let i=1; i<=10; i++) {
        seedData.push(generateBlogPostData());
    }
    return BlogPost.insertMany(seedData);
}

//  generate an object representing a blogpost
function generateBlogPostData() {
    return {
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        },
        content: faker.lorem.sentence(),
        title: faker.lorem.text(),
    };
}

function tearDownDb() {
    console.warn("deleting database");
    return mongoose.connection.dropDatabase();
}

describe('Blogposts API resource', function() {

    // I need each of these hook functions to return a promise
    // otherwise I would need to call a `done` callback.  `runServer`, 
    // `seedBlogPostData` and `tearDownDb` each return a promise,
    // so I return the value returned by these function calls.

    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function() {
        return seedBlogPostData();
    });

    afterEach(function() {
        return tearDownDb();
    });

    after(function() {
        return closeServer();
    });

    //  nested `describe` blocks
    describe('GET endpoint', function() {

        it('should return all existing blogposts', function() {
            // strategy:
            //  1.  get back all blogposts returned by GET request to `/blogposts
            //  2.  prove response object (res) has the right status and data type
            //  3.  prove the number of blogposts we received is equal to the number
            //      in the database.
            //
            //  I need to have access to mutate and access the response object (res)
            //  acroos all the `.then()` calls below, so I declare it here so I can
            //  modify it in place.

            let res;
            return chai.request(app)
              .get('/blogposts')
              .then(function(_res) {
                  //  so subsequent .tehn blocks can access response object
                  res = _res;
                  expect(res).to.have.status(200);
                  //  otherwise our database seeding did not work
                  expect(res.body.blogposts).to.have.lengthOf.at.least(1);
                  return BlogPosts.count();
              })
              .then(function(count) {
                  expect(res.body.blogposts).to.have.lengthOf(count);
              });
        });

        it('should return blogposts with the right fields', function() {
            //  strategy:  get back all the blogposts and ensure that they have all the expected keys

            let resBlogPost;
            return chai.request(app)
                .get('/blogposts')
                .then(function(res) {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body.blogposts).to.be.a('array')
                    expect(res.body.blogposts).to.have.lengthOf.at.least(1);

                    res.body.blogposts.forEach(function(blogpost) {
                        expect(blogpost).to.be.a('object');
                        expect(blogpost).to.include.keys(
                            'id', 'author','content','title','created');
                    });
                    resBlogPost = res.body.blogposts[0];
                })
                .then(function(blogpost) {
                    expect(resBlogPost.id).to.equal(blogpost.id);
                    expect(resBlogPost.author).to.equal(blogpost.author);
                    expect(resBlogPost.content).to.equal(blogpost.content);
                    expect(resBlogPost.title).to.equal(blogpost.title);
                    expect(resBlogPost.created).to.equal(blogpost.created);
                });
        });
    });
/*
    describe ('POST endpoint', function() {
        //  strategy:  make a POST request with data,
        //  then prove that the blogpost we get back has
        //  the right keys, and that `'id` is there(which means
        //  the data was inserted into the database)

        it('should add a new blogpost', function() {

            const newBlogPost = generateBlogPostData();

            return chai.request(app)
                .post('/blogposts')
                .send(newBlogPost)
                .then(function(res) {
                    expect(res).to.have.status(201);
                    expect(res).to.be.json;
                    expect(res.body).to.be.a('object');
                    expect(res.body).to.include.keys(
                        'id', 'author','content','title','created');
                    expect(res.body.title).to.equal(newBlogPost.title);
                    expect(res.body.id).to.not.be.null;
                    expect(res.body.author).to.equal(newBlogPost.author);
                    expect(res.body.content).to.equal(newBlogPost.content);
                    expect(res.body.title).to.equal(newBlogPost.title);
                    //expect(res.body.created).to.equal(newBlogPost.created);
                    return BlogPost.findById(res.body.id);
                })
                .then(function(blogpost) {
                    expect(blogpost.author).to.equal(newBlogPost.author);
                    expect(blogpost.title).to.equal(newBlogPost.title);
                    expect(blogpost.content).to.equal(newBlogPost.title);
                    expect(blogpost.created).to.equal(newBlogPost.created);
                });
        });
    });

    describe('PUT endpoint', function() {

        //  strategy:
        //      1.  Get an existing blogpost from the database
        //      2.  Make a PUT request to update that blogpost
        //      3.  Prove that the blogpost returned by the request contains the data I sent
        //      4.  Prove that the blopost in the database is correctly updated.

        it('should update fields I sent over', function() {
            const updateData = {
                title: "this is Missy's first blogpost",
                content: " I hope to do well on this test of my blogpost API"
            };

            return BlogPost
                .findOne()
                .then(function(blogpost) {
                    updateData.id = blogpost.id;

                    // make the request and then inspect the response to make sure
                    //  it reflects the data I sent.
                    return chai.request(app)
                        .put(`/blogposts/${blogpost.id}`)
                        .send(updateData);
                })
                .then(function(res) {
                    expect(res).to.have.status(204);
                    return BlogPost.fundById(updateData.id);
                })
                .then(function(blogpost) {
                    expect(blogpost.title).to.equal(updateData.title);
                    expect(blogpost.content).to.equal(updateData.content);
                });
        });
    });

    describe('DELETE endpoint', function() {

        //  strategy:
        //      1.  get any restaurant using the findOne helper function
        //      2.  make a DELETE reqeust for that blogpost's id
        //      3.  assert that the response(res) has the right status code
        //      4.  prove that the blogpost with the id does not exist anymore
        //          in the database

        it('delete a blogpost by id', function() {

            let blogpost;

            return BlogPost
                .findOne()
                .then(function(_blogpost) {
                    blogpost = _blogpost;
                    return chai.request(app).delete(`/blogposts/${blogpost.id}`);
                })
                .then(function(res) {
                    expect(res).to.have.status(204);
                    return BlogPost.findById(blogpost.id);
                })
                .then(function(_blogpost) {
                    expect.(_blogpost).to.be.null;
                });
        });
    });
*/
});

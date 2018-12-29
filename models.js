'use strict';

const mongoose = require('mongoose');

// this is the author schema
const authorSchema = mongoose.Schema({
    firstName: 'string',
    lastName: 'string',
    userName: {
        type: 'string',
        unique: true
    }
});

const commentSchema = mongoose.Schema({content: 'string'});

// this is our schema to represent a blogpost
const blogpostSchema = mongoose.Schema({
    title: String,
    content: String,
    author: {type: mongoose.Schema.Types.ObjectId, ref:'Author'},
    comments: [commentSchema],
    created:{
        type: Date,
        // `Date.now()` returns the current unix timestamp as a number
        default: Date.now
      }

});

blogpostSchema.pre('findOne', function(next) {
    this.populate('authors');
    next();
});

blogpostSchema.pre('find', function(next) {
    this.populate('authors');
    next();
});

blogpostSchema.virtual("authorName").get(function() {
    return `${this.authors.firstName} ${this.authors.lastName}`.trim();
});

blogpostSchema.methods.serialize = function() {
    return {
        id:this._id,
        author: this.firstName,
        content: this.content,
        title: this.title,
        created: this.created,
        comments: this.comments
    };
};

const BlogPost = mongoose.model("Blogpost", blogpostSchema);
const Author =  mongoose.model('Author', authorSchema);

module.exports = {BlogPost, Author};
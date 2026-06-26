// This file is required before any test is run

// Taken from the should wiki, this is how to make should global.
global.should = require('should').noConflict();
should.extend();

// Sinon is a simple case.
global.sinon = require('sinon');

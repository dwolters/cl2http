/* eslint-disable space-before-function-paren */
const path = require('path');
const expect = require('chai').expect;
const jsonfile = require('jsonfile').readFileSync;
const app = require('../app')(jsonfile(path.join(__dirname, '../../../examples/test/json/fileio.' + process.env.FORMAT + '.json')));
const service = require('supertest')(app);
const fs = require('fs');

describe('File I/O', function () {
    it('should write the input to input file if flag is set', function (done) {
        service
            .post('/test/fileio/input')
            .send('some text')
            .set('Content-Type', 'text/plain')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.command).to.equal('fileCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.inputFile.exists).to.equal(true, 'Input file was not created!');
                expect(res.body.arguments.inputFile.content).to.equal('some text', 'Input file content malformed!');
                done(err);
            });
    });

    it('should write the output to output file if flag is set', function (done) {
        service
            .post('/test/fileio')
            .set('Content-Type', 'text/plain')
            .send('some text')
            .expect(200)
            .end((err, res) => {
                expect(res.body.toString()).to.equal('some text');
                done(err);
            });
    });

    it('should serve a static file', function (done) {
        service
            .get('/test/fileio/static')
            .expect(200)
            .end((err, res) => {
                expect(res.text).to.equal(fs.readFileSync('examples/test/json/fileio.openapi.json').toString());
                done(err);
            });
    });
});

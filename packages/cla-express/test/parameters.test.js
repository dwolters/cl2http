/* eslint-disable space-before-function-paren */
const path = require('path');
const expect = require('chai').expect;
const jsonfile = require('jsonfile').readFileSync;
const app = require('../app')(jsonfile(path.join(__dirname, '../../../examples/test/json//parameters.' + process.env.FORMAT + '.json')));
const service = require('supertest')(app);

describe('Parameter Support', function () {
    it('should support header parameters', function (done) {
        service
            .get('/test/headerParams')
            .set('test-parameter', 'someValue')
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal('someValue', 'Wrong parameter value!');
                done(err);
            });
    });

    it('should support query parameters', function (done) {
        service
            .get('/test/queryParams?testParameter=someValue')
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal('someValue', 'Wrong parameter value!');
                done(err);
            });
    });

    it('should support path parameters', function (done) {
        service
            .get('/test/pathParams/someValue/divider/anotherValue')
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal('someValue', 'Wrong parameter value!');
                expect(res.body.arguments.optionalArg).to.equal('anotherValue', 'Wrong parameter value!');
                done(err);
            });
    });

    it('should support text body parameters', function (done) {
        service
            .post('/test/body/text')
            .set('Content-Type', 'text/plain')
            .send('someText')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal('someText', 'Wrong parameter value!');
                done(err);
            });
    });

    it('should support body transformation', function (done) {
        service
            .post('/test/body/transform')
            .set('Content-Type', 'text/plain')
            .send('TEXT')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal('text', 'Wrong parameter value!');
                done(err);
            });
    });

    it('should support json path query on body parameter (result as list)', function (done) {
        service
            .post('/test/body/json/list')
            .send([{name: 'hans'}, {name: 'franz'}])
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal('hans,franz', 'Wrong parameter value!');
                done(err);
            });
    });

    it('should support join json query path result', function (done) {
        service
            .post('/test/body/json/joined')
            .send([{name: 'hans'}, {name: 'franz'}])
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal('hans franz', 'Wrong parameter value!');
                done(err);
            });
    });

    it('should support json body parameters (result as array with single value)', function (done) {
        service
            .post('/test/body/json/valueAsArray')
            .send({name: 'value'})
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal(JSON.stringify(['value']), 'Wrong parameter value!');
                done(err);
            });
    });

    it('should support json body parameters (result as single value)', function (done) {
        service
            .post('/test/body/json/value')
            .send({name: 'value'})
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal('value', 'Wrong parameter value!');
                done(err);
            });
    });

    it('should support regex query with single value', function (done) {
        service
            .post('/test/body/regex/value')
            .set('Content-Type', 'text/plain')
            .send('sadsad 14651 sdfsdfgsdf')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal('14651', 'Wrong parameter value!');
                done(err);
            });
    });

    it('should support regex query with joined result', function (done) {
        service
            .post('/test/body/regex/list')
            .set('Content-Type', 'text/plain')
            .send('sadsad 14651 45438 34294sdfsdfgsdf')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal('14651 45438 34294', 'Wrong parameter value!');
                done(err);
            });
    });

    it('should support regex query group selector', function (done) {
        service
            .post('/test/body/regex/list')
            .set('Content-Type', 'text/plain')
            .send('num7')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal('7', 'Wrong parameter value!');
                done(err);
            });
    });

    it('should support replacing parameters in predefined input', function (done) {
        service
            .post('/test/param/input')
            .send({first: 'John', second: 'Doe'})
            .expect(200)
            .expect('Content-Type', /text.plain/)
            .end((err, res) => {
                expect(res.text.trim()).to.equal('"John" "Doe"', 'Wrong parameter value!');
                done(err);
            });
    });

    it('should support transforming input', function (done) {
        service
            .post('/test/param/input/transform')
            .set('Content-Type', 'text/plain')
            .send('TEXT')
            .expect(200)
            .expect('Content-Type', /text.plain/)
            .end((err, res) => {
                expect(res.text.trim()).to.equal('text', 'Wrong parameter value!');
                done(err);
            });
    });

    if (process.env.FORMAT == 'openapi') {
        it('should support transforming input based on content type', function (done) {
            service
                .post('/test/param/input/transform')
                .set('Content-Type', 'application/json')
                .send({foo: 'bar'})
                .expect(200)
                .expect('Content-Type', /text.plain/)
                .end((err, res) => {
                    expect(res.text.trim()).to.equal('bar', 'Wrong parameter value!');
                    done(err);
                });
        });
    }

    it('should support replacing parameters in predefined output', function (done) {
        service
            .post('/test/param/output')
            .send({first: 'John', second: 'Doe'})
            .expect(200)
            .expect('Content-Type', /text.plain/)
            .end((err, res) => {
                expect(res.text.trim()).to.equal('"John" "Doe"', 'Wrong parameter value!');
                done(err);
            });
    });

    it('should transform output', function (done) {
        service
            .post('/test/param/output/transform')
            .set('Content-Type', 'text/plain')
            .send('TEXT')
            .expect(200)
            .expect('Content-Type', /text.plain/)
            .end((err, res) => {
                expect(res.text.trim()).to.equal('text', 'Wrong parameter value!');
                done(err);
            });
    });

    if (process.env.FORMAT == 'openapi') {
        it('should transform output based on content type', function (done) {
            service
                .post('/test/param/output/transform')
                .set('Content-Type', 'text/plain')
                .set('Accept', 'application/json')
                .send('TEXT')
                .expect(200)
                .expect('Content-Type', /json/)
                .end((err, res) => {
                    expect(res.text.trim()).to.equal(JSON.stringify({text: 'TEXT'}), 'Wrong parameter value!');
                    done(err);
                });
        });
    }

    it('should return an error if a parameter is required but no value was provided', function (done) {
        service
            .get('/test/queryParams')
            .expect('Content-Type', /html/)
            .expect(500)
            .end((err, res) => {
                expect(res.text).to.include('Internal Server Error', 'Missing error message!');
                done(err);
            });
    });
});

describe('Parameter Transformation', function () {
    it('should apply dictionary-based parameter transformation', function (done) {
        service
            .get('/test/parameterTransform/dictionaryTransform')
            .set('testparameter', 'originalValue')
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal('transformedValue', 'Wrong transformed parameter value!');
                expect(res.body.arguments.optionalArg).to.equal('originalValue', 'Wrong original parameter value!');
                done(err);
            });
    });

    it('should apply function-based parameter transformation', function (done) {
        service
            .post('/test/parameterTransform/functionTransform')
            .set('testparameter', 'UPPERCASE')
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.optionalArg).to.equal('UPPERCASE', 'Wrong original parameter value!');
                expect(res.body.arguments.requiredArg).to.equal('uppercase', 'Wrong transformed parameter value!');
                done(err);
            });
    });

    it('should provide :var as =var if no transformation is specified', function (done) {
        service
            .post('/test/parameterTransform/noTransform')
            .set('testparameter', 'originalValue')
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal('originalValue', 'Wrong transformed parameter value!');
                expect(res.body.arguments.optionalArg).to.equal('originalValue', 'Wrong original parameter value!');
                done(err);
            });
    });

    it('should apply referenced transformations', function (done) {
        service
            .get('/test/parameterTransform/referencedTransform?testparameter=originalValue')
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal('transformedValue', 'Wrong transformed parameter value!');
                expect(res.body.arguments.optionalArg).to.equal('originalValue', 'Wrong original parameter value!');
                done(err);
            });
    });
});

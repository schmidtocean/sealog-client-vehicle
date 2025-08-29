import React, { Component } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { reduxForm, Field, reset } from 'redux-form';
import { Button, Form, InputGroup } from 'react-bootstrap';
import DOMPurify from 'dompurify'; 
import * as mapDispatchToProps from '../actions';

// This will strip all HTML tags from the input.
const sanitizeInput = (value) => {
  // Return the sanitized value, or the original value if it's empty/falsy
  return value ? DOMPurify.sanitize(value, { USE_PROFILES: { html: false } }) : value;
};
class EventInput extends Component {

  constructor (props) {
    super(props);
  }

  handleFormSubmit({eventFreeText}) {
    this.props.createEvent('FREE_FORM', eventFreeText);
  }

  render() {
    const { handleSubmit, submitting, pristine } = this.props;

    return (
      <Form className={this.props.className} onSubmit={ handleSubmit(this.handleFormSubmit.bind(this)) }>
        <InputGroup>
          <Field
            name="eventFreeText"
            component="input"
            type="text"
            placeholder="Type new event"
            className="form-control"
            normalize={sanitizeInput}
          />
          <InputGroup.Append>
            <Button block type="submit" disabled={submitting || pristine}>Submit</Button>
          </InputGroup.Append>
        </InputGroup>
      </Form>
    );
  }
}

function mapStateToProps() {
  return {};
}

function afterSubmit(result, dispatch) {
  dispatch(reset('eventInput'));
}

export default compose(
  connect(mapStateToProps, mapDispatchToProps),
  reduxForm({
    form: 'eventInput',
    onSubmitSuccess: afterSubmit
  })
)(EventInput);

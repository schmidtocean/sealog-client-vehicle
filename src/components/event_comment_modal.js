import React, { Component, createRef } from 'react';
import { compose } from 'redux';
import PropTypes from 'prop-types';
import { Button, Form, Modal } from 'react-bootstrap';
import { connectModal } from 'redux-modal';
import { reduxForm, Field } from 'redux-form';
import { renderTextArea } from './form_elements';

class EventCommentModal extends Component {

  constructor (props) {
    super(props);
    this.handleFormSubmit = this.handleFormSubmit.bind(this);
  }

  static propTypes = {
    event: PropTypes.object,
    handleHide: PropTypes.func.isRequired,
    handleUpdateEvent: PropTypes.func
  };

  componentDidMount() {
    this.populateDefaultValues();
  }

  componentDidUpdate(prevProps) {
    if(prevProps.event !== this.props.event) {
      this.populateDefaultValues();
    }
  }

  componentWillUnmount() {}

  populateDefaultValues() {
    const { event, initialize } = this.props;
    const event_option_comment = event ? event.event_options.find(event_option => event_option.event_option_name === 'event_comment') : null;
    if (event_option_comment) {
      initialize({ 'event_comment': event_option_comment.event_option_value });
    }
  }


  handleFormSubmit(formProps) {

    const { event, handleUpdateEvent, handleHide } = this.props;
    let existing_comment = false;
    let event_options = (event && event.event_options) ? event.event_options.map(event_option => {
      if (event_option.event_option_name === 'event_comment') {
        existing_comment = true;
        return { event_option_name: 'event_comment', event_option_value: formProps.event_comment}
      } else {
        return event_option
      }
    }) : [];

    if(!existing_comment) {
      event_options.push({ event_option_name: 'event_comment', event_option_value: formProps.event_comment})
    }

    handleUpdateEvent(event.id, event.event_value, event.event_free_text, event_options, event.ts);
    handleHide();
  }

  render() {
    const { show, handleHide, handleSubmit, submitting, valid, event } = this.props

      return (
        <Modal show={show} onHide={handleHide} onEntered={() => document.getElementById('event_comment').focus()}>
          <Form onSubmit={handleSubmit(this.handleFormSubmit)}>
            <Modal.Header closeButton>
              <Modal.Title>Add/Update Comment</Modal.Title>
            </Modal.Header>

            <Modal.Body>
              <Field
                name="event_comment"
                component={renderTextArea}
                id="event_comment"
              />
            </Modal.Body>

            <Modal.Footer>
              <Button variant="secondary" size="sm" disabled={submitting} onClick={handleHide}>Cancel</Button>
              <Button variant="primary" size="sm" type="submit" disabled={ submitting || !valid}>Submit</Button>
            </Modal.Footer>
          </Form>
        </Modal>
      );
  }
}

export default compose(
  connectModal({name: 'eventComment'}),
  reduxForm({form: 'eventCommentModal'}),
)(EventCommentModal)
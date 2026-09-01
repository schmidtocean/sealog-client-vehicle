import React, { Component } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { reduxForm, Field, reset } from 'redux-form'
import { Button, Form, InputGroup } from 'react-bootstrap'
import PropTypes from 'prop-types'
import DOMPurify from 'dompurify'
import * as mapDispatchToProps from '../actions'

// This will strip all HTML tags from the input.
const sanitizeInput = (value) => {
  // Return the sanitized value, or the original value if it's empty/falsy
  return value ? DOMPurify.sanitize(value, { USE_PROFILES: { html: false } }) : value
}

class EventInput extends Component {
  constructor(props) {
    super(props)
  }

  handleFormSubmit(formProps) {
    this.props.createEvent({ ...formProps, event_value: 'FREE_FORM' })
  }

  render() {
    const { handleSubmit, submitting, pristine } = this.props

    return (
      <Form className={this.props.className} onSubmit={handleSubmit(this.handleFormSubmit.bind(this))}>
        <InputGroup>
          <Field
            name='event_free_text'
            component='input'
            type='text'
            placeholder='Type new event'
            className='form-control'
            normalize={sanitizeInput}
          />
          <Button type='submit' disabled={submitting || pristine}>
            Submit
          </Button>
        </InputGroup>
      </Form>
    )
  }
}

EventInput.propTypes = {
  className: PropTypes.string,
  createEvent: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  pristine: PropTypes.bool.isRequired,
  submitting: PropTypes.bool.isRequired
}

const mapStateToProps = () => {
  return {}
}

const afterSubmit = (result, dispatch) => {
  dispatch(reset('eventInput'))
}

export default compose(
  connect(mapStateToProps, mapDispatchToProps),
  reduxForm({
    form: 'eventInput',
    onSubmitSuccess: afterSubmit
  })
)(EventInput)

import React, { Component } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { reduxForm, Field } from 'redux-form'
import { Button, Col, Form, Row } from 'react-bootstrap'
import { renderDateTimePicker, renderTextField, dateFormat } from './form_elements'
import moment from 'moment'
import PropTypes from 'prop-types'
import * as mapDispatchToProps from '../actions'

const timeFormat = 'HH:mm:ss.SSS'
const LOWERING_START_MILESTONE = 'start_ts'
const LOWERING_STOP_MILESTONE = 'stop_ts'

function isRequiredMilestone(key) {
  return key === LOWERING_START_MILESTONE || key === LOWERING_STOP_MILESTONE
}

class LoweringStatsForm extends Component {
  constructor(props) {
    super(props)
  }

  handleFormSubmit(formProps) {
    const milestones = this.props.milestoneItems.reduce((milestones, milestone) => {
      const value = formProps.milestones && formProps.milestones[milestone.key]
      milestones[milestone.key] = value && value._isAMomentObject ? value.toISOString() : value || null
      return milestones
    }, {})

    if (
      (formProps.stats.bounding_box.bbox_north == null || formProps.stats.bounding_box.bbox_north == '') &&
      (formProps.stats.bounding_box.bbox_east == null || formProps.stats.bounding_box.bbox_east == '') &&
      (formProps.stats.bounding_box.bbox_south == null || formProps.stats.bounding_box.bbox_south == '') &&
      (formProps.stats.bounding_box.bbox_west == null || formProps.stats.bounding_box.bbox_west == '')
    ) {
      formProps.stats.bounding_box = []
    } else {
      formProps.stats.bounding_box = [
        formProps.stats.bounding_box.bbox_north,
        formProps.stats.bounding_box.bbox_east,
        formProps.stats.bounding_box.bbox_south,
        formProps.stats.bounding_box.bbox_west
      ]
    }

    const lowering_additional_meta = {
      ...this.props.lowering.lowering_additional_meta,
      milestones,
      stats: formProps.stats
    }

    delete lowering_additional_meta['lowering_files']

    this.props.handleFormSubmit({
      ...this.props.lowering,
      start_ts: milestones[LOWERING_START_MILESTONE],
      stop_ts: milestones[LOWERING_STOP_MILESTONE],
      lowering_additional_meta
    })
  }

  render() {
    const { handleSubmit, submitting, valid, pristine } = this.props

    const milestoneFields = this.props.milestoneItems.map((milestone) => {
      return (
        <Field
          name={'milestones.' + milestone.key}
          key={milestone.key}
          component={renderDateTimePicker}
          label={milestone.label}
          required={isRequiredMilestone(milestone.key)}
          timeFormat={timeFormat}
          lg={8}
          className='field-stats'
        />
      )
    })

    if (this.props.roles && (this.props.roles.includes('admin') || this.props.roles.includes('cruise_manager'))) {
      return (
        <Form onSubmit={handleSubmit(this.handleFormSubmit.bind(this))}>
          <Row>
            <Col sm={6}>
              <div>
                <strong style={{ fontSize: 'large' }}>Milestones</strong>
              </div>
              {milestoneFields}
            </Col>
            <Col sm={6}>
              <div>
                <strong style={{ fontSize: 'large' }}>Stats</strong>
              </div>
              <Row className='justify-content-sm-center'>
                <Field
                  name='stats.max_depth'
                  component={renderTextField}
                  label='Max Depth'
                  placeholder='in meters'
                  lg={5}
                  md={6}
                  className='field-stats'
                />
              </Row>
              <Row className='justify-content-sm-center'>
                <Field
                  name='stats.bounding_box.bbox_north'
                  component={renderTextField}
                  label='North'
                  placeholder='in ddeg'
                  lg={5}
                  md={6}
                  className='field-stats'
                />
              </Row>
              <Row className='justify-content-sm-center'>
                <Field
                  name='stats.bounding_box.bbox_west'
                  component={renderTextField}
                  label='West'
                  placeholder='in ddeg'
                  lg={5}
                  md={6}
                  className='field-stats'
                />
                <Field
                  name='stats.bounding_box.bbox_east'
                  component={renderTextField}
                  label='East'
                  placeholder='in ddeg'
                  lg={5}
                  md={6}
                  className='field-stats'
                />
              </Row>
              <Row className='justify-content-sm-center'>
                <Field
                  name='stats.bounding_box.bbox_south'
                  component={renderTextField}
                  label='South'
                  placeholder='in ddeg'
                  lg={5}
                  md={6}
                  className='field-stats'
                />
              </Row>
            </Col>
          </Row>
          <Row>
            <Col xs={12}>
              <div className='float-end'>
                <Button className='me-1' variant='outline-secondary' size='sm' onClick={this.props.handleHide}>
                  Cancel
                </Button>
                <Button variant='outline-primary' size='sm' type='submit' disabled={pristine || submitting || !valid}>
                  Done
                </Button>
              </div>
            </Col>
          </Row>
        </Form>
      )
    } else {
      return <div>What are YOU doing here?</div>
    }
  }
}

LoweringStatsForm.propTypes = {
  handleFormSubmit: PropTypes.func.isRequired,
  handleHide: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  lowering: PropTypes.object.isRequired,
  milestoneItems: PropTypes.array.isRequired,
  pristine: PropTypes.bool.isRequired,
  roles: PropTypes.array,
  submitting: PropTypes.bool.isRequired,
  valid: PropTypes.bool.isRequired
}

const validate = (formProps, props) => {
  const errors = { milestones: {}, stats: {} }
  const milestoneValues = formProps.milestones || {}

  const setMilestoneError = (key, error) => {
    errors.milestones[key] = error
  }

  props.milestoneItems.forEach((milestone) => {
    const value = milestoneValues[milestone.key]

    if (isRequiredMilestone(milestone.key) && (value == null || value === '')) {
      setMilestoneError(milestone.key, 'Required')
    } else if (value && !moment.utc(value, dateFormat + ' ' + timeFormat).isValid()) {
      setMilestoneError(milestone.key, 'Invalid timestamp')
    }
  })

  const start_ts = milestoneValues[LOWERING_START_MILESTONE]
  const stop_ts = milestoneValues[LOWERING_STOP_MILESTONE]

  if (start_ts && stop_ts) {
    if (moment.utc(stop_ts, dateFormat + ' ' + timeFormat).isBefore(moment.utc(start_ts, dateFormat + ' ' + timeFormat))) {
      setMilestoneError(LOWERING_STOP_MILESTONE, 'Stop timestamp must be later than start timestamp')
    }
  }

  if (!(formProps.stats.max_depth >= 0)) {
    errors.stats.max_depth = 'Must be a positive floating point number'
  }

  if (!(formProps.stats.bounding_box.bbox_north >= -90 && formProps.stats.bounding_box.bbox_north <= 90)) {
    errors.stats.bounding_box = { ...errors.stats.bounding_box, bbox_north: 'Must be a number between +/- 90' }
  }

  if (!(formProps.stats.bounding_box.bbox_east >= -180 && formProps.stats.bounding_box.bbox_east <= 180)) {
    errors.stats.bounding_box = { ...errors.stats.bounding_box, bbox_east: 'Must be a number between +/- 180' }
  }

  if (!(formProps.stats.bounding_box.bbox_south >= -90 && formProps.stats.bounding_box.bbox_south <= 90)) {
    errors.stats.bounding_box = { ...errors.stats.bounding_box, bbox_south: 'Must be a number between +/- 90' }
  }

  if (!(formProps.stats.bounding_box.bbox_west >= -180 && formProps.stats.bounding_box.bbox_west <= 180)) {
    errors.stats.bounding_box = { ...errors.stats.bounding_box, bbox_west: 'Must be a number between +/- 180' }
  }

  return errors
}

const mapStateToProps = (state, ownProps) => {
  const bounding_box =
    ownProps.stats && ownProps.stats.bounding_box && ownProps.stats.bounding_box.length == 4
      ? ownProps.stats.bounding_box
      : [null, null, null, null]

  const initialValues = {
    milestones: ownProps.milestones || {},
    stats: {
      max_depth: ownProps.stats ? ownProps.stats.max_depth : null,
      bounding_box: {
        bbox_north: bounding_box[0],
        bbox_east: bounding_box[1],
        bbox_south: bounding_box[2],
        bbox_west: bounding_box[3]
      }
    }
  }

  return {
    initialValues,
    lowering: state.lowering.lowering,
    roles: state.user.profile.roles
  }
}

export default compose(
  connect(mapStateToProps, mapDispatchToProps),
  reduxForm({
    form: 'editLoweringStats',
    validate: validate
  })
)(LoweringStatsForm)

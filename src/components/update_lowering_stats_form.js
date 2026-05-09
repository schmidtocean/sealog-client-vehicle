import React, { Component } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { reduxForm, Field } from 'redux-form';
import { Button, Col, Form, Row} from 'react-bootstrap';
import { renderDateTimePicker, renderTextField } from './form_elements';
import moment from 'moment';
import PropTypes from 'prop-types';
import { CUSTOM_LOWERING_NAME } from '../client_config';
import * as mapDispatchToProps from '../actions';

const timeFormat = "HH:mm:ss.SSS";
const LOWERING_START_MILESTONE = 'lowering_start';
const LOWERING_STOP_MILESTONE = 'lowering_stop';

class UpdateLoweringStatsForm extends Component {

  constructor (props) {
    super(props);

    this.state = {
      lowering_name: (CUSTOM_LOWERING_NAME)? CUSTOM_LOWERING_NAME[0].charAt(0).toUpperCase() + CUSTOM_LOWERING_NAME[0].slice(1) : "Lowering"
    }
  }

  static propTypes = {
    handleFormSubmit: PropTypes.func.isRequired,
    handleHide: PropTypes.func.isRequired,
    milestoneItems: PropTypes.array.isRequired,
    milestones: PropTypes.object.isRequired,
    stats: PropTypes.object.isRequired
  };

  componentDidMount() {

    let initialValues = {
      milestones: this.props.milestoneItems.map((milestone) => {
        return { value: this.props.milestones[milestone.key] || null }
      }),
      max_depth: (this.props.stats.max_depth) ? this.props.stats.max_depth : null,
      bbox_north: (this.props.stats.bounding_box.length == 4) ? this.props.stats.bounding_box[0] : null,
      bbox_east: (this.props.stats.bounding_box.length == 4) ? this.props.stats.bounding_box[1] : null,
      bbox_south: (this.props.stats.bounding_box.length == 4) ? this.props.stats.bounding_box[2] : null,
      bbox_west: (this.props.stats.bounding_box.length == 4) ? this.props.stats.bounding_box[3] : null
    }

    this.props.initialize(initialValues);
  }

  componentWillUnmount() {
  }

  formatDateValue(value) {
    return (value && value._isAMomentObject) ? value.toISOString() : value;
  }

  handleFormSubmit(formProps) {

    let milestones = {}

    this.props.milestoneItems.forEach((milestone, index) => {
      const formMilestone = formProps.milestones && formProps.milestones[index];
      milestones[milestone.key] = formMilestone ? this.formatDateValue(formMilestone.value) : null;
    });

    let stats= {
      max_depth: formProps.max_depth,
    }

    if((formProps.bbox_north == null || formProps.bbox_north == "") && (formProps.bbox_east == null || formProps.bbox_east == "") && (formProps.bbox_south == null || formProps.bbox_south == "") && (formProps.bbox_west == null || formProps.bbox_west == "")) {
      stats.bounding_box=[]
    }
    else {
      stats.bounding_box=[formProps.bbox_north, formProps.bbox_east, formProps.bbox_south, formProps.bbox_west]
    }

    this.props.handleFormSubmit(milestones, stats)
  }

  renderTextField({ input, label, placeholder, required, meta: { touched, error } }) {
    let requiredField = (required)? <span className='text-danger'> *</span> : ''
    let placeholder_txt = (placeholder)? placeholder: label

    return (
      <Form.Group as={Row}>
        <Form.Label column sm={4} xs={5}><span className="float-right">{label}{requiredField}</span></Form.Label>
        <Col sm={8} xs={7}>
          <Form.Control size="sm" type="text" {...input} placeholder={placeholder_txt} isInvalid={touched && error}/>
          <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
        </Col>
      </Form.Group>
    )
  }

  render() {

    const { handleSubmit, submitting, valid, pristine } = this.props;
    const milestoneFields = this.props.milestoneItems.map((milestone, index) => {
      return (
        <Form.Row className="justify-content-sm-center" key={milestone.key}>
          <Field
            name={`milestones[${index}].value`}
            component={renderDateTimePicker}
            label={`${milestone.label} Date/Time (UTC)`}
            required={milestone.key === LOWERING_START_MILESTONE || milestone.key === LOWERING_STOP_MILESTONE}
            timeFormat={timeFormat}
            sm={11}
            md={11}
            lg={7}
          />
        </Form.Row>
      )
    });

    if (this.props.roles && (this.props.roles.includes("admin") || this.props.roles.includes('cruise_manager'))) {

      return (
            <Form onSubmit={ handleSubmit(this.handleFormSubmit.bind(this)) }>
              <Row>
                <Col className="px-1" sm={6}>
                  {milestoneFields}
                </Col>
                <Col className='px-1' sm={6}>
                  <Form.Row className="justify-content-sm-center">
                    <Field
                      name="max_depth"
                      component={renderTextField}
                      label="Max Depth"
                      placeholder="in meters"
                      lg={5}
                      md={7}
                      sm={7}
                    />
                  </Form.Row>
                  <Form.Row className="justify-content-sm-center">
                    <Field
                      name="bbox_north"
                      component={renderTextField}
                      label="North"
                      placeholder="in ddeg"
                      lg={5}
                      md={6}
                    />
                  </Form.Row>
                  <Form.Row className="justify-content-sm-center">
                    <Field
                      name="bbox_west"
                      component={renderTextField}
                      label="West"
                      placeholder="in ddeg"
                      lg={5}
                      md={6}
                    />
                    <Field
                      name="bbox_east"
                      component={renderTextField}
                      label="East"
                      placeholder="in ddeg"
                      lg={5}
                      md={6}
                    />
                  </Form.Row>
                  <Form.Row className="justify-content-sm-center">
                    <Field
                      name="bbox_south"
                      component={renderTextField}
                      label="South"
                      placeholder="in ddeg"
                      lg={5}
                      md={6}
                    />
                  </Form.Row>
                </Col>
              </Row>
              <Row>
                <Col xs={12}>
                  <div className="float-right">
                    <Button className="mr-1" variant="secondary" size="sm" onClick={this.props.handleHide}>Cancel</Button>
                    <Button variant="warning" size="sm" type="submit" disabled={pristine || submitting || !valid}>Done</Button>
                  </div>
                </Col>
              </Row>
            </Form>
      )
    } else {
      return (
        <div>
          What are YOU doing here?
        </div>
      )
    }
  }
}

function validate(formProps, props) {

  const errors = {};
  const milestoneValues = formProps.milestones || [];
  const setMilestoneError = (index, error) => {
    if(!errors.milestones) {
      errors.milestones = [];
    }

    errors.milestones[index] = { value: error };
  }

  const startIndex = props.milestoneItems.findIndex((milestone) => milestone.key === LOWERING_START_MILESTONE);
  const stopIndex = props.milestoneItems.findIndex((milestone) => milestone.key === LOWERING_STOP_MILESTONE);

  props.milestoneItems.forEach((milestone, index) => {
    const value = milestoneValues[index] ? milestoneValues[index].value : null;

    if((milestone.key === LOWERING_START_MILESTONE || milestone.key === LOWERING_STOP_MILESTONE) && (value == null || value === '')) {
      setMilestoneError(index, 'Required');
    }
    else if(value && !moment.utc(value).isValid()) {
      setMilestoneError(index, 'Invalid timestamp');
    }
  });

  if(startIndex >= 0 && stopIndex >= 0 && milestoneValues[startIndex] && milestoneValues[stopIndex] && milestoneValues[startIndex].value && milestoneValues[stopIndex].value) {
    if(moment.utc(milestoneValues[stopIndex].value).isBefore(moment.utc(milestoneValues[startIndex].value))) {
      setMilestoneError(stopIndex, 'Stop date must be later than start date');
    }
  }

  if (!(formProps.max_depth >= 0)) {
    errors.max_depth = 'Must be a positive floating point number'
  }

  if (!(formProps.bbox_north >= -60 && formProps.bbox_north <= 60)) {
    errors.bbox_north = 'Must be a number between +/- 60'
  }

  if (!(formProps.bbox_east >= -180 && formProps.bbox_east <= 180)) {
    errors.bbox_east = 'Must be a number between +/- 180'
  }

  if (!(formProps.bbox_south >= -60 && formProps.bbox_south <= 60)) {
    errors.bbox_south = 'Must be a number between +/- 60'
  }

  if (!(formProps.bbox_west >= -180 && formProps.bbox_west <= 180)) {
    errors.bbox_west = 'Must be a number between +/- 180'
  }

  return errors;

}

function mapStateToProps(state) {
  return {
    roles: state.user.profile.roles
  };
}

export default compose(
  connect(mapStateToProps, mapDispatchToProps),
  reduxForm({
    form: 'editLoweringStats',
    validate: validate
  })
)(UpdateLoweringStatsForm);

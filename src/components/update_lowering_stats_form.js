import React, { Component } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { reduxForm, Field } from 'redux-form';
import { Button, Col, Form, Row} from 'react-bootstrap';
import { renderDateTimePicker, renderTextField } from './form_elements';
import moment from 'moment';
import PropTypes from 'prop-types';
import * as mapDispatchToProps from '../actions';

const timeFormat = "HH:mm:ss.SSS";
const LOWERING_START_MILESTONE = 'lowering_start';
const LOWERING_STOP_MILESTONE = 'lowering_stop';

function isRequiredMilestone(key) {
  return key === LOWERING_START_MILESTONE || key === LOWERING_STOP_MILESTONE;
}

function buildMilestoneValues(milestoneItems, milestones) {
  return milestoneItems.reduce((values, milestone) => {
    values[milestone.key] = { value: milestones[milestone.key] || null };
    return values;
  }, {});
}

class UpdateLoweringStatsForm extends Component {
  static propTypes = {
    handleFormSubmit: PropTypes.func.isRequired,
    handleHide: PropTypes.func.isRequired,
    milestoneItems: PropTypes.array.isRequired,
    milestones: PropTypes.object.isRequired,
    stats: PropTypes.object.isRequired
  };

  componentDidMount() {
    let initialValues = {
      milestones: buildMilestoneValues(this.props.milestoneItems, this.props.milestones),
      max_depth: (this.props.stats.max_depth) ? this.props.stats.max_depth : null,
      bbox_north: (this.props.stats.bounding_box.length == 4) ? this.props.stats.bounding_box[0] : null,
      bbox_east: (this.props.stats.bounding_box.length == 4) ? this.props.stats.bounding_box[1] : null,
      bbox_south: (this.props.stats.bounding_box.length == 4) ? this.props.stats.bounding_box[2] : null,
      bbox_west: (this.props.stats.bounding_box.length == 4) ? this.props.stats.bounding_box[3] : null
    }

    this.props.initialize(initialValues);
  }

  formatDateValue(value) {
    return (value && value._isAMomentObject) ? value.toISOString() : value;
  }

  handleFormSubmit(formProps) {

    const milestones = this.props.milestoneItems.reduce((milestones, milestone) => {
      const formMilestone = formProps.milestones && formProps.milestones[milestone.key];
      milestones[milestone.key] = formMilestone ? this.formatDateValue(formMilestone.value) : null;
      return milestones;
    }, {});

    const bbox = [formProps.bbox_north, formProps.bbox_east, formProps.bbox_south, formProps.bbox_west];
    const stats = {
      max_depth: formProps.max_depth,
      bounding_box: bbox.every((value) => value == null || value == "") ? [] : bbox
    }

    this.props.handleFormSubmit(milestones, stats)
  }

  render() {

    const { handleSubmit, submitting, valid, pristine } = this.props;
    const milestoneFields = this.props.milestoneItems.map((milestone) => {
      return (
        <Form.Row className="justify-content-sm-center" key={milestone.key}>
          <Field
            name={`milestones.${milestone.key}.value`}
            component={renderDateTimePicker}
            label={`${milestone.label} Date/Time (UTC)`}
            required={isRequiredMilestone(milestone.key)}
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
  const milestoneValues = formProps.milestones || {};
  const setMilestoneError = (key, error) => {
    if(!errors.milestones) {
      errors.milestones = {};
    }

    errors.milestones[key] = { value: error };
  }

  const startMilestone = milestoneValues[LOWERING_START_MILESTONE];
  const stopMilestone = milestoneValues[LOWERING_STOP_MILESTONE];

  props.milestoneItems.forEach((milestone) => {
    const value = milestoneValues[milestone.key] ? milestoneValues[milestone.key].value : null;

    if(isRequiredMilestone(milestone.key) && (value == null || value === '')) {
      setMilestoneError(milestone.key, 'Required');
    }
    else if(value && !moment.utc(value).isValid()) {
      setMilestoneError(milestone.key, 'Invalid timestamp');
    }
  });

  if(startMilestone && stopMilestone && startMilestone.value && stopMilestone.value) {
    if(moment.utc(stopMilestone.value).isBefore(moment.utc(startMilestone.value))) {
      setMilestoneError(LOWERING_STOP_MILESTONE, 'Stop date must be later than start date');
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

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Alert, Button, Tab, Tabs } from 'react-bootstrap';
import EventTemplateOptionsModal from './event_template_options_modal';
import { Client } from '@hapi/nes/lib/client';
import { WS_ROOT_URL } from '../client_config';
import { POWER_LOGGER } from '../standard_user_role_options';
import * as mapDispatchToProps from '../actions';

class EventTemplateList extends Component {
  constructor(props) {
    super(props);

    this.client = new Client(`${WS_ROOT_URL}`);
    this.connectToWS = this.connectToWS.bind(this);
    this.renderEventTemplates = this.renderEventTemplates.bind(this);
    this.handleEventSubmit = this.handleEventSubmit.bind(this);
  }

  componentDidMount() {
    if (this.props.authenticated) {
      this.props.fetchEventTemplatesForMain();
      this.connectToWS();
    }
  }

  componentWillUnmount() {
    this.client.disconnect();
  }

  async connectToWS() {
    try {
      await this.client.connect();
      // {
      //   auth: {
      //     headers: {
      //       authorization: cookies.get('token')
      //     }
      //   }
      // })

      const updateHandler = () => {
        this.props.fetchEventTemplatesForMain();
      };

      const deleteHandler = () => {
        this.props.fetchEventTemplatesForMain();
      };

      this.client.subscribe('/ws/status/newEventTemplates', updateHandler);
      this.client.subscribe('/ws/status/updateEventTemplates', updateHandler);
      this.client.subscribe('/ws/status/deleteEventTemplates', deleteHandler);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  isPowerLogger() {
    return this.props.roles && this.props.roles.includes(POWER_LOGGER);
  }

  filterTemplates(event_templates) {
    return event_templates.filter(
      (template) =>
        (template.disabled ?? false) === false &&
        (this.isPowerLogger() || (template.is_power_logger ?? false) === false)
    );
  }

  getVisibleCategories(event_templates) {
    const categories = new Set();
    event_templates.forEach((template) => {
      template.template_categories.forEach((category) => categories.add(category));
    });
    return Array.from(categories).sort();
  }

  renderCategoryTabs(visibleCategories, event_templates) {
    return (
      <Tabs
        className="category-tab"
        variant="pills"
        activeKey={this.props.event_template_category || (visibleCategories.length > 0 ? visibleCategories[0] : 'all')}
        id="event-template-tabs"
        onSelect={(category) => this.props.updateEventTemplateCategory(category)}
      >
        {visibleCategories.map((category) => (
          <Tab eventKey={category} title={category} key={category}>
            {this.filterTemplates(event_templates)
              .filter((template) => template.template_categories.includes(category))
              .map((template) => (
                <Button
                  className="mt-1 mr-1 py-3 btn-template"
                  variant="primary"
                  to="#"
                  key={`template_${template.id}`}
                  onClick={(e) => this.handleEventSubmit(template, e)}
                >
                  {template.event_name}
                </Button>
              ))}
          </Tab>
        ))}
        <Tab eventKey="all" title="All">
          {this.filterTemplates(event_templates).map((template) => (
            <Button
              className="mt-1 mr-1 py-3 btn-template"
              variant="primary"
              to="#"
              key={`template_${template.id}`}
              onClick={(e) => this.handleEventSubmit(template, e)}
            >
              {template.event_name}
            </Button>
          ))}
        </Tab>
      </Tabs>
    );
  }

  renderEventTemplates() {
    const { event_templates } = this.props;
    if (!event_templates || event_templates.length === 0) {
      return <div>No event template found</div>;
    }

    const filteredTemplates = this.filterTemplates(event_templates);
    if (filteredTemplates.length === 0) {
      return <div>No event template found</div>;
    }

    const visibleCategories = this.getVisibleCategories(filteredTemplates);
    return this.renderCategoryTabs(visibleCategories, filteredTemplates);
  }

  async handleEventSubmit(event_template, e = null) {
    const needs_modal =
      (e && e.shiftKey) || event_template.event_options.some((option) => option.event_option_type !== 'static text');
    if (event_template.event_free_text_required || needs_modal) {
      const event = await this.props.createEvent(event_template.event_value, '', []);
      this.props.showModal('eventOptions', {
        eventTemplate: event_template,
        event: event,
        handleUpdateEvent: this.props.updateEvent,
        handleDeleteEvent: this.props.deleteEvent,
      });
    } else {
      const event_options = event_template.event_options.map((option) => ({
        event_option_name: option.event_option_name,
        event_option_value: option.event_option_default_value,
      }));
      await this.props.createEvent(event_template.event_value, '', event_options);
    }
  }

  render() {
    if (!this.props.event_templates) {
      return <div style={this.props.style}>Loading...</div>;
    }

    if (this.props.event_templates.length > 0) {
      return (
        <div style={this.props.style}>
          <EventTemplateOptionsModal
            handleUpdateEvent={this.props.updateEvent}
            handleDeleteEvent={this.props.deleteEvent}
          />
          {this.renderEventTemplates()}
        </div>
      );
    }

    return <Alert variant="danger">No Event Templates found</Alert>;
  }
}

function mapStateToProps(state) {
  return {
    authenticated: state.auth.authenticated,
    event_templates: state.event_history.event_templates,
    event_template_category: state.event_history.event_template_category,
    roles: state.user.profile.roles,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(EventTemplateList);

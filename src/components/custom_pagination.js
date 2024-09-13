import React, { Component } from 'react';
import { Pagination } from 'react-bootstrap';
import PropTypes from 'prop-types';

class CustomPagination extends Component {
  constructor(props) {
    super(props);
    this.state = {
      maxPerPage: this.props.maxPerPage || 10
    };
  }

  static propTypes = {
    maxPerPage: PropTypes.number,
    pageSelectFunc: PropTypes.func.isRequired,
    page: PropTypes.number.isRequired,
    count: PropTypes.number.isRequired,
    className: PropTypes.string
  };

  componentDidUpdate(prevProps) {
    if (prevProps.maxPerPage !== this.props.maxPerPage) {
      this.setState({ maxPerPage: this.props.maxPerPage });
    }
  }

  render() {
    const { page, count, pageSelectFunc, className } = this.props;
    const { maxPerPage } = this.state;
    const totalPages = Math.ceil(count / maxPerPage);
    const delta = 2; // Show pages within a delta of 2 from the current page

    if (count > maxPerPage) {
      let left = page - delta;
      let right = page + delta;
      let range = [];
      let rangeWithDots = [];
      let l = null;

      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= left && i <= right)) {
          range.push(i);
        }
      }

      for (let i of range) {
        if (l) {
          if (i - l === 2) {
            rangeWithDots.push(
              <Pagination.Item key={l + 1} active={page === l + 1} onClick={() => pageSelectFunc(l + 1)}>
                {l + 1}
              </Pagination.Item>
            );
          } else if (i - l !== 1) {
            rangeWithDots.push(<Pagination.Ellipsis key={`ellipsis_${i}`} />);
          }
        }
        rangeWithDots.push(
          <Pagination.Item key={i} active={page === i} onClick={() => pageSelectFunc(i)}>
            {i}
          </Pagination.Item>
        );
        l = i;
      }

      return (
        <Pagination className={className}>
          <Pagination.First onClick={() => pageSelectFunc(1)} />
          <Pagination.Prev onClick={() => page > 1 && pageSelectFunc(page - 1)} />
          {rangeWithDots}
          <Pagination.Next onClick={() => page < totalPages && pageSelectFunc(page + 1)} />
          <Pagination.Last onClick={() => pageSelectFunc(totalPages)} />
        </Pagination>
      );
    }

    return null;
  }
}

export default CustomPagination;

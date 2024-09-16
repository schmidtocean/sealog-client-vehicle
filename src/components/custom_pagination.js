import React, { Component } from 'react';
import { Pagination } from 'react-bootstrap';
import PropTypes from 'prop-types';
import debounce from 'lodash/debounce';

class CustomPagination extends Component {
  constructor(props) {
    super(props);
    this.state = {
      maxPerPage: this.props.maxPerPage || 10,
      currentPage: this.props.page
    };
    
    // Debounce the pageSelectFunc with a smaller delay
    this.debouncedPageSelect = debounce(this.props.pageSelectFunc, 100);
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
    
    if (prevProps.page !== this.props.page) {
      this.setState({ currentPage: this.props.page });
    }
    
    if (prevProps.pageSelectFunc !== this.props.pageSelectFunc) {
      this.debouncedPageSelect = debounce(this.props.pageSelectFunc, 100);
    }
  }

  componentWillUnmount() {
    this.debouncedPageSelect.cancel();
  }

  handlePageSelect = (pageNumber) => {
    this.setState({ currentPage: pageNumber }, () => {
      this.debouncedPageSelect(pageNumber);
    });
  }

  render() {
    const { count, className } = this.props;
    const { maxPerPage, currentPage } = this.state;
    const totalPages = Math.ceil(count / maxPerPage);
    const delta = 2; // Show pages within a delta of 2 from the current page

    if (count > maxPerPage) {
      let left = currentPage - delta;
      let right = currentPage + delta;
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
              <Pagination.Item 
                key={l + 1} 
                active={currentPage === l + 1} 
                onClick={() => this.handlePageSelect(l + 1)}
              >
                {l + 1}
              </Pagination.Item>
            );
          } else if (i - l !== 1) {
            rangeWithDots.push(<Pagination.Ellipsis key={`ellipsis_${i}`} />);
          }
        }
        rangeWithDots.push(
          <Pagination.Item 
            key={i} 
            active={currentPage === i} 
            onClick={() => this.handlePageSelect(i)}
          >
            {i}
          </Pagination.Item>
        );
        l = i;
      }

      return (
        <Pagination className={className}>
          <Pagination.First onClick={() => this.handlePageSelect(1)} />
          <Pagination.Prev onClick={() => currentPage > 1 && this.handlePageSelect(currentPage - 1)} />
          {rangeWithDots}
          <Pagination.Next onClick={() => currentPage < totalPages && this.handlePageSelect(currentPage + 1)} />
          <Pagination.Last onClick={() => this.handlePageSelect(totalPages)} />
        </Pagination>
      );
    }

    return null;
  }
}

export default CustomPagination;

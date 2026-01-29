import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Map Error Boundary Caught:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || <div className="hidden">Map Error</div>;
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

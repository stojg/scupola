import React from 'react';
import ReactDOM from 'react-dom';
import "core-js";

const App = (props: { text: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | React.ReactFragment | React.ReactPortal; }) => {
    return (
        <div>
            <h2>{props.text}</h2>
        </div>
    );
};

ReactDOM.render(
    <div>
        <App text="Webpack React and Golang" />
    </div>
    ,
    document.getElementById("app")
);


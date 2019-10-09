import React from "react";
import Authentication from "../../util/Authentication/Authentication";
import ExternalServices from "../../util/ExternalServices/ExternalServices";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import FormControl from "react-bootstrap/FormControl";
import Button from "react-bootstrap/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSms, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import sm256 from "./sm256.png";
import smw256 from "./smw256.png";
import sm64256 from "./sm64256.png";
import "./Panel.css";

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.Authentication = new Authentication();
    this.ExternalServices = new ExternalServices();

    // if the extension is running on twitch or dev rig, set the shorthand here. otherwise, set to null.
    this.twitch = window.Twitch ? window.Twitch.ext : null;
    this.state = {
      finishedLoading: false,
      isVisible: true
    };

    this.games = [
      {
        title: "Super Metroid",
        image: sm256,
        categories: [
          "Any% No Major Glitches",
          "100% No Major Glitches",
          "Low% Ice Beam"
        ]
      },
      {
        title: "Super Mario World",
        image: smw256,
        categories: [
          "Any%",
          "96 Exit",
          "Any% No Cape No Star World",
          "Lunar Dragon",
          "All Castles"
        ]
      },
      {
        title: "Super Mario 64",
        image: sm64256,
        categories: ["0 Star", "1 Star", "16 Star", "70 Star", "120 Star"]
      }
    ];
  }

  contextUpdate(context, delta) {
    if (delta.includes("theme")) {
      this.setState(() => {
        return { theme: context.theme };
      });
    }
  }

  visibilityChanged(isVisible) {
    this.setState(() => {
      return {
        isVisible
      };
    });
  }

  componentDidMount() {
    this.ExternalServices.getPlayerInfo("cyghfer");

    if (this.twitch) {
      this.twitch.onAuthorized(auth => {
        this.Authentication.setToken(auth.token, auth.userId);
        if (!this.state.finishedLoading) {
          // if the component hasn't finished loading (as in we've not set up after getting a token), let's set it up now.

          // now we've done the setup for the component, let's set the state to true to force a rerender with the correct data.
          this.setState(() => {
            return { finishedLoading: true };
          });
        }
      });

      this.twitch.listen("broadcast", (target, contentType, body) => {
        this.twitch.rig.log(
          `New PubSub message!\n${target}\n${contentType}\n${body}`
        );
        // now that you've got a listener, do something with the result...

        // do something...
      });

      this.twitch.onVisibilityChanged((isVisible, _c) => {
        this.visibilityChanged(isVisible);
      });

      this.twitch.onContext((context, delta) => {
        this.contextUpdate(context, delta);
      });
    }
  }

  componentWillUnmount() {
    if (this.twitch) {
      this.twitch.unlisten("broadcast", () =>
        console.log("successfully unlistened")
      );
    }
  }

  render() {
    console.log(this);
    if (this.state.finishedLoading && this.state.isVisible) {
      return (
        <div className="panel">
          <section className="header-section">
            <h2>Catch The Run</h2>
            <h3>{this.twitch.configuration.broadcaster || "cyghfer"}</h3>
          </section>
          <section className="games-section">
            {this.games.map(game => (
              <div className="game-container" key={game.title}>
                <img src={game.image} className="game-boxart" />
                <h5 className="game-title">{game.title}</h5>
                <div className="category-list">
                  <Form>
                    <Form.Group>
                      {game.categories.map((category, idx) => (
                        <Form.Check
                          custom
                          key={category}
                          type="checkbox"
                          id={`${game.title}-${idx}`}
                          label={category}
                        />
                      ))}
                    </Form.Group>
                  </Form>
                </div>
              </div>
            ))}
          </section>
          <section className="protocol-input-section">
            <InputGroup size="sm">
              <InputGroup.Prepend>
                <InputGroup.Text>
                  <FontAwesomeIcon icon={faSms} />
                </InputGroup.Text>
              </InputGroup.Prepend>
              <FormControl
                placeholder="Phone Number"
                aria-label="Phone Number"
              />
              <InputGroup.Prepend>
                <InputGroup.Text>
                  <FontAwesomeIcon icon={faEnvelope} />
                </InputGroup.Text>
              </InputGroup.Prepend>
              <FormControl
                placeholder="Email Address"
                aria-label="Email Address"
              />
            </InputGroup>
          </section>
          <Button onClick={this.ExternalServices.sendSubscriptionRequest}>
            Subscribe
          </Button>
        </div>
      );
    } else {
      return <div className="panel"></div>;
    }
  }
}

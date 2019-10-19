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
    this.images = {
      sm: sm256,
      smw: smw256,
      sm64: sm64256
    };
    this.Authentication = new Authentication();
    this.ExternalServices = new ExternalServices();

    // if the extension is running on twitch or dev rig, set the shorthand here. otherwise, set to null.
    this.twitch = window.Twitch ? window.Twitch.ext : null;

    this.state = {
      finishedLoading: false,
      isVisible: true,
      playerName: undefined,
      playerTopicArn: undefined,
      games: undefined,
      viewerPhoneNumber: undefined,
      viewerEmailAddress: undefined
    };

    this.toggleCategory = this.toggleCategory.bind(this);
    this.updateInput = this.updateInput.bind(this);
    this.subscribeViewerToPlayer = this.subscribeViewerToPlayer.bind(this);
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
    if (this.twitch) {
      this.twitch.onAuthorized(auth => {
        this.Authentication.setToken(auth.token, auth.userId);

        this.ExternalServices.getPlayerFeedInfo(
          this.Authentication.state.user_id
        )
          .then(data => {
            const [playerName, playerTopicArn] = data.Items[0]["G1S"].S.split(
              "|"
            );
            const games = [];

            const rawCategories = data.Items.filter(item =>
              item.SRT.S.includes("F|")
            ).map(item => item.SRT.S.split("|")[2]);

            rawCategories.forEach(category => {
              const [gameTitle, categoryName, gameAbbrev] = category.split("_");

              const categoryObj = {
                name: categoryName,
                selected: true
              };

              const idx = games.reduce((idx, currGame, currIdx) => {
                if (games[currIdx].title === gameTitle) idx = currIdx;
                return idx;
              }, -1);

              if (idx === -1) {
                games.push({
                  title: gameTitle,
                  image: this.images[gameAbbrev],
                  categories: [categoryObj]
                });
              } else {
                games[idx].categories.push(categoryObj);
              }
            });

            this.setState({
              playerName,
              playerTopicArn,
              games,
              finishedLoading: true
            });
          })
          .catch(err => {
            console.log("error:", err);
          });
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

  toggleCategory(gameTitle, categoryIdx) {
    this.state.games.filter(game => game.title === gameTitle)[0].categories[
      categoryIdx
    ].selected = !this.state.games.filter(game => game.title === gameTitle)[0]
      .categories[categoryIdx].selected;
    this.setState({ games: this.state.games });
  }

  updateInput(property, value) {
    const stateObj = {};
    stateObj[property] = value;
    this.setState(stateObj);
  }

  subscribeViewerToPlayer() {
    let phoneSubscription;
    let emailSubscription;

    if (this.state.viewerPhoneNumber) {
      phoneSubscription = this.ExternalServices.sendSubscriptionRequest(
        this.state.playerTopicArn,
        this.Authentication.state.user_id,
        this.state.playerUsername,
        "SMS",
        this.state.viewerPhoneNumber
      );
    }

    if (this.state.viewerEmailAddress) {
      emailSubscription = this.ExternalServices.sendSubscriptionRequest(
        this.state.playerTopicArn,
        this.Authentication.state.user_id,
        this.state.playerUsername,
        "Email",
        this.state.viewerEmailAddress
      );
    }

    Promise.all([phoneSubscription, emailSubscription])
      .then(([phoneRes, emailRes]) => {
        console.log("phoneRes:", phoneRes);
        console.log("emailRes:", emailRes);
      })
      .catch(err => console.log("err:", err));
  }

  render() {
    console.log(this);
    if (this.state.finishedLoading && this.state.isVisible) {
      return (
        <div className="panel">
          <section className="header-section">
            <h2>Catch The Run</h2>
            <h3>{this.state.playerUsername}</h3>
          </section>
          <section className="games-section">
            {this.state.games.map(game => (
              <div className="game-container" key={game.title}>
                <img src={game.image} className="game-boxart" />
                <h5 className="game-title">{game.title}</h5>
                <div className="category-list">
                  <Form>
                    <Form.Group>
                      {game.categories.map((category, idx) => (
                        <Form.Check
                          custom
                          key={category.name}
                          checked={category.selected}
                          type="checkbox"
                          id={`${game.title}-${idx}`}
                          label={category.name}
                          onChange={() => this.toggleCategory(game.title, idx)}
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
                value={this.state.viewerPhoneNumber}
                placeholder="Phone Number"
                aria-label="Phone Number"
                onChange={e =>
                  this.updateInput("viewerPhoneNumber", e.target.value)
                }
              />
              <InputGroup.Prepend>
                <InputGroup.Text>
                  <FontAwesomeIcon icon={faEnvelope} />
                </InputGroup.Text>
              </InputGroup.Prepend>
              <FormControl
                value={this.state.viewerEmailAddress}
                placeholder="Email Address"
                aria-label="Email Address"
                onChange={e =>
                  this.updateInput("viewerEmailAddress", e.target.value)
                }
              />
            </InputGroup>
          </section>
          <Button onClick={this.subscribeViewerToPlayer}>Subscribe</Button>
        </div>
      );
    } else {
      return <div className="panel"></div>;
    }
  }
}

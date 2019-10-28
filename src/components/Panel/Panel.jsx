import React from "react";
import Authentication from "../../util/Authentication/Authentication";
import ExternalServices from "../../util/ExternalServices/ExternalServices";
import { urlBase64ToUint8Array } from "../../util/ServiceWorker/ServiceWorkerHelpers";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import FormControl from "react-bootstrap/FormControl";
import Button from "react-bootstrap/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSms, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import sm256 from "./sm256.png";
import smw256 from "./smw256.png";
import sm64256 from "./sm64256.png";
import "../../util/ServiceWorker/ServiceWorker.js";
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
      playerUsername: undefined,
      playerTopicArn: undefined,
      games: undefined
    };

    this.toggleCategory = this.toggleCategory.bind(this);
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

        this.ExternalServices.getPlayerFeedInfo("cyghfer")
          .then(data => {
            const [playerUsername, playerTopicArn] = data.Items[0][
              "G1S"
            ].S.split("|");
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
                if (currGame.title === gameTitle) idx = currIdx;
                return idx;
              }, -1);

              if (idx === -1) {
                games.push({
                  title: gameTitle,
                  image: `https://catch-the-run-boxart.s3.us-east-2.amazonaws.com/${gameAbbrev}256.png`,
                  categories: [categoryObj]
                });
              } else {
                games[idx].categories.push(categoryObj);
              }
            });

            this.setState({
              playerUsername,
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

  subscribeViewerToPlayer() {
    navigator.serviceWorker.register("ServiceWorker.js");

    navigator.serviceWorker.ready
      .then(registration => {
        return Promise.all([
          registration,
          registration.pushManager.getSubscription()
        ]);
      })
      .then(([registration, existingSubscription]) => {
        console.log(
          "registration:",
          registration,
          "existingSubscription:",
          existingSubscription
        );
        if (existingSubscription) return existingSubscription;

        const vapidPublicKey = ".";
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

        return registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      })
      .then(newSubscription => {
        return this.ExternalServices.sendSubscriptionRequest(
          this.Authentication.state.user_id,
          this.state.playerUsername,
          newSubscription.endpoint,
          "WEBPUSH"
        );
      })
      .then(res => {
        console.log("response:", res);
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
          <Button onClick={this.subscribeViewerToPlayer}>Subscribe</Button>
        </div>
      );
    } else {
      return <div className="panel"></div>;
    }
  }
}

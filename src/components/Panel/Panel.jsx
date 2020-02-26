import React from 'react';
import Authentication from '../../util/Authentication/Authentication';
import Database from '../../util/Database/Database';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import './Panel.css';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.Authentication = new Authentication();
    this.Database = new Database();

    // if the extension is running on twitch or dev rig, set the shorthand here. otherwise, set to null.
    this.twitch = window.Twitch ? window.Twitch.ext : null;

    this.state = {
      finishedLoading: false,
      isVisible: true,
      producer: undefined,
      games: undefined
    };

    this.toggleCategory = this.toggleCategory.bind(this);
    this.subscribeViewerToPlayer = this.subscribeViewerToPlayer.bind(this);
  }

  contextUpdate(context, delta) {
    if (delta.includes('theme')) {
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
      this.twitch.onAuthorized(async auth => {
        this.Authentication.setToken(auth.token, auth.userId);

        const dbCategoryItems = (await this.Database.getFeedCategories('cyghfer')).Items;
        const games = [];

        const rawCategories = dbCategoryItems.map(item => item.SRT.split('|')[2]);

        rawCategories.forEach(category => {
          const [gameTitle, categoryName, gameAbbrev] = category.split('_');

          const categoryObj = {
            name: categoryName,
            selected: false
          };

          const idx = games.reduce((idx, currGame, currIdx) => {
            if (currGame.title === gameTitle) idx = currIdx;
            return idx;
          }, -1);

          if (idx === -1) {
            games.push({
              title: gameTitle,
              image: `https://catch-the-run-boxart.s3.us-east-2.amazonaws.com/${gameAbbrev}256.png`,
              selected: false,
              categories: [categoryObj]
            });
          } else {
            games[idx].categories.push(categoryObj);
          }
        });

        this.setState({
          producer: 'cyghfer',
          games,
          finishedLoading: true
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
      this.twitch.unlisten('broadcast', () => console.log('successfully unlistened'));
    }
  }

  toggleGame(gIdx) {
    let game = this.state.games[gIdx];
    game.selected = !game.selected;

    game.categories.forEach(c => c.selected = game.selected);

    this.setState({ games: this.state.games });
  }

  toggleCategory(gIdx, cIdx) {
    let game = this.state.games[gIdx];
    let category = game.categories[cIdx];
    category.selected = !category.selected;

    if (!category.selected && game.selected) game.selected = false;

    this.setState({ games: this.state.games });
  }

  subscribeViewerToPlayer() {
    const openedWindow = window.open(
      'https://catch-the-run-website.cyghfer.now.sh/',
      'Catch The Run',
      'height=500,width=500'
    );

    const handlePushSubscriptionCreation = async e => {
      if (e.data.loadComplete) openedWindow.postMessage({}, '*');
      else {
        openedWindow.close();
        const { stringifiedSubscription } = e.data;
        const response = await this.Database.saveNewPushSubscription(this.state.producer, stringifiedSubscription);
        if (response) {
          console.log('success!');
          window.removeEventListener('message', handlePushSubscriptionCreation);
        }
      }
    };

    window.addEventListener('message', handlePushSubscriptionCreation);
  }

  render() {
    console.log(this);
    if (this.state.finishedLoading && this.state.isVisible) {
      return (
        <div className='panel'>
          <section className='header-section'>
            <h3>My Notifications Feed</h3>
          </section>
          <section className='games-section'>
            {this.state.games.map((game, gIdx) => (
              <div className='game-container' key={game.title}>
                <img src={game.image} className='game-boxart' />
                <Form>
                  <Form.Group>
                    <Form.Check
                      custom
                      key={game.title}
                      checked={game.selected}
                      type='checkbox'
                      className='game-line'
                      id={game.title}
                      label={game.title}
                      onChange={() => this.toggleGame(gIdx)}
                    />
                    <div className={game.selected ? 'category-list game-selected' : 'category-list'}>
                      {game.categories.map((category, cIdx) => (
                        <Form.Check
                          custom
                          key={category.name}
                          checked={game.selected ? true : category.selected}
                          type='checkbox'
                          className='category-line'
                          id={`${game.title}-${cIdx}`}
                          label={category.name}
                          onChange={() => this.toggleCategory(gIdx, cIdx)}
                        />
                      ))}
                    </div>
                  </Form.Group>
                </Form>
              </div>
            ))}
          </section>
          <section className='button-section'>
            <Button onClick={this.subscribeViewerToPlayer}>Subscribe for Push Notifications</Button>
          </section>
        </div>
      );
    } else {
      return <div className='panel'></div>;
    }
  }
}

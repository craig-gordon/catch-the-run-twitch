import React, { useState, useEffect } from 'react';
import Authentication from '../../util/Authentication/Authentication';
import Database from '../../util/Database/Database';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import './Panel.css';

// eslint-disable-next-line react/display-name
const Panel = props => {
  const [_theme, setTheme] = useState(undefined);
  const [_finishedLoading, setFinishedLoading] = useState(false);
  const [_isVisible, setIsVisible] = useState(true);
  const [_producer, setProducer] = useState('');
  const [_games, setGames] = useState([]);

  const twitch = window.Twitch ? window.Twitch.ext : null;
  const dbClient = new Database();
  let authContext = null;

  useEffect(() => {
    const handleVisibilityChanged = (isVisible) => setIsVisible(isVisible);

    const handleContextUpdate = (context, delta) => {
      if (delta.includes('theme')) {
        setTheme(context.theme);
      }
    }

    const getProducerTwitchUsername = async twitchId => {
      const items = (await dbClient.getUserRecordsByTwitchId(twitchId.toString())).Items;
      if (items.length > 0) {
        return items[0].PRT;
      }
    }

    const processProducerFeed = categories => {
      const games = [];
    
      const rawCategories = categories.map(item => item.SRT.split('|')[2]);
    
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
  
      return games;
    }

    if (twitch) {
      twitch.onAuthorized(async auth => {
        authContext = new Authentication(auth.token, auth.userId, auth.channelId);
        const producer = await getProducerTwitchUsername(authContext.state.broadcasterId);
        setProducer(producer);
        setFinishedLoading(true);

        const categoryItems = (await dbClient.getFeedCategories(producer)).Items;
        const games = processProducerFeed(categoryItems);
        setGames(games);

        twitch.onVisibilityChanged((isVisible, _c) => handleVisibilityChanged(isVisible));
        twitch.onContext((context, delta) => handleContextUpdate(context, delta));
      });

      return () => twitch.unlisten('broadcast', () => console.log('successfully unlistened'));
    }
  }, []);

  const toggleGame = gIdx => {
    const games = [..._games];
    let game = games[gIdx];
    game.selected = !game.selected;

    game.categories.forEach(c => c.selected = game.selected);

    setGames(games);
  }

  const toggleCategory = (gIdx, cIdx) => {
    const games = [..._games];
    let game = games[gIdx];
    let category = game.categories[cIdx];
    category.selected = !category.selected;

    if (!category.selected && game.selected) game.selected = false;

    setGames(games);
  }

  const subscribeViewerToPlayer = () => {
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
        const response = await Database.saveNewPushSubscription(_producer, stringifiedSubscription);
        if (response) {
          console.log('success!');
          window.removeEventListener('message', handlePushSubscriptionCreation);
        }
      }
    };

    window.addEventListener('message', handlePushSubscriptionCreation);
  }

  if (_finishedLoading && _isVisible) {
    return (
      <div className='panel'>
        <section className='header-section'>
          <h3>My Notifications Feed</h3>
        </section>
        <section className='games-section'>
          {_games.map((game, gIdx) => (
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
                    onChange={() => toggleGame(gIdx)}
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
                        onChange={() => toggleCategory(gIdx, cIdx)}
                      />
                    ))}
                  </div>
                </Form.Group>
              </Form>
            </div>
          ))}
        </section>
        <section className='button-section'>
          <Button onClick={subscribeViewerToPlayer}>Subscribe for Push Notifications</Button>
        </section>
      </div>
    );
  } else {
    return <div className='panel'></div>;
  }
};

export default Panel;
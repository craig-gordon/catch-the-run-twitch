import React, { useState, useEffect } from 'react';
import Authentication from '../../util/Authentication/Authentication';
import Database from '../../util/Database/Database';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import './Panel.css';

const Panel = props => {
  const [_theme, setTheme] = useState(undefined);
  const [_finishedLoading, setFinishedLoading] = useState(false);
  const [_isVisible, setIsVisible] = useState(true);
  const [_producer, setProducer] = useState('');
  const [_consumer, setConsumer] = useState('');
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

    const getTwitchUsername = async twitchId => {
      const items = (await dbClient.getUserRecordsByTwitchId(twitchId.toString())).Items;
      return items.length > 0 ? items[0].PRT : null;
    }

    const getExistingPushSubscription = async (consumer, producer) => {
      const sub = (await dbClient.getPushSubscription(consumer, producer)).Item;
      return sub || null;
    }

    const findCategory = (games, categoryName) => {
      for (let i = 0; i < games.length; i++) {
        for (let j = 0; j < games[i].categories.length; j++) {
          const c = games[i].categories[j];
          if (categoryName === c) {
            return c;
          }
        }
      }
      return null;
    }

    const processProducerFeed = categories => {
      const games = [];
       
      categories.forEach(category => {
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
            abbrev: gameAbbrev,
            image: `https://catch-the-run-boxart.s3.us-east-2.amazonaws.com/${gameAbbrev}256.png`,
            selected: false,
            expanded: false,
            categories: [categoryObj]
          });
        } else {
          games[idx].categories.push(categoryObj);
        }
      });
  
      return games;
    }

    const setSelected = (sub, games, categories) => {
      if (sub.IncludedGames) {
        sub.IncludedGames.forEach(ig => {
          const game = games.filter(g => g.title === ig)[0];
          if (game) game.selected = true;
        });
      }

      if (sub.IncludedCategories) {
        sub.IncludedCategories.forEach(ic => {
          const category = categories.filter(c => c.slice(0, c.lastIndexOf('_')) === ic)[0];
          if (category) findCategory(category).selected = true;
        })
      }
    }

    if (twitch) {
      twitch.onAuthorized(async auth => {
        authContext = new Authentication(auth.token, auth.userId, auth.channelId);

        const consumer = await getTwitchUsername(authContext.state.user_id);
        const producer = await getTwitchUsername(authContext.state.broadcasterId);

        setProducer(producer);

        const categories = (await dbClient.getFeedCategories(producer)).Items.map(item => item.SRT.split('|')[2]);
        const games = processProducerFeed(categories);

        setConsumer(consumer);

        if (_consumer !== null) {
          const sub = await getExistingPushSubscription(consumer, producer);
          if (sub) setSelected(sub, games, categories);
        }

        setGames(games);
        setFinishedLoading(true);

        twitch.onVisibilityChanged((isVisible, _c) => handleVisibilityChanged(isVisible));
        twitch.onContext((context, delta) => handleContextUpdate(context, delta));
      });

      return () => twitch.unlisten('broadcast', () => console.log('successfully unlistened'));
    }
  }, []);

  const toggleGameSelected = gIdx => {
    const games = [..._games];
    let game = games[gIdx];
    game.selected = !game.selected;

    game.categories.forEach(c => c.selected = game.selected);

    setGames(games);
  }

  const toggleGameExpanded = gIdx => {
    const games = [..._games];
    let game = games[gIdx];
    game.expanded = !game.expanded;

    setGames(games);
  }

  const toggleCategorySelected = (gIdx, cIdx) => {
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
        const [includedGames, includedCategories] = formatSelectedItemsForDatabase(_games);
        const response = await dbClient.addPushSubscription(_producer, includedGames, includedCategories, stringifiedSubscription);
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
                    onChange={() => toggleGameSelected(gIdx)}
                  />
                  <div className={game.selected ? 'category-list game-selected' : 'category-list'}>
                    {getCategoriesToRender(game).map((category, cIdx) => (
                      <Form.Check
                        custom
                        key={category.name}
                        checked={game.selected ? true : category.selected}
                        type='checkbox'
                        className='category-line'
                        id={`${game.title}-${cIdx}`}
                        label={category.name}
                        onChange={() => toggleCategorySelected(gIdx, cIdx)}
                      />
                    ))}
                  </div>
                </Form.Group>
              </Form>
              <Button
                variant='primary'
                className={game.categories.length > 3 ? 'expand-btn' : 'expand-btn hidden'}
                onClick={() => toggleGameExpanded(gIdx)}
              >
                <div className='expand-btn-text'>...</div>
              </Button>
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

const getCategoriesToRender = game => {
  if (game.categories.length <= 3) {
    return game.categories;
  } else {
    return game.expanded ? game.categories : game.categories.slice(0, 3);
  }
};

const formatSelectedItemsForDatabase = games => {
  const includedItems = [[], []];

  games.forEach(game => {
    if (game.selected) includedItems[0].push(game.title);

    game.categories.forEach(category => {
      if (category.selected && !game.selected) {
        includedItems[1].push(`${game.title}_${category.name}_${game.abbrev}`);
      }
    });
  });

  return includedItems;
};

export default Panel;
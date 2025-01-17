import React from 'react';
import axios from 'axios';
import { sortBy } from 'lodash';
import styled from 'styled-components';
import { ReactComponent as Check } from './check.svg';
import { ReactComponent as UpArrow } from './upload.svg';
import { ReactComponent as DownArrow } from './download.svg';

type Story = {
  objectID: string;
  url: string;
  title: string;
  author: string;
  num_comments: number;
  points: number;
};

type Stories = Array<Story>;

const useSemiPersistentState = (
  key: string,
  initialState: string
): [string, (newValue: string) => void] => {
  const isMounted = React.useRef(false);

  const [value, setValue] = React.useState(
    localStorage.getItem(key) || initialState
  );

  React.useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
    } else {
      localStorage.setItem(key, value);
    }
  }, [value, key]);

  return [value, setValue];
};

type StoriesState = {
  data: Stories;
  page: number;
  isLoading: boolean;
  isError: boolean;
};

interface StoriesFetchInitAction {
  type: 'STORIES_FETCH_INIT';
}

interface StoriesFetchSuccessAction {
  type: 'STORIES_FETCH_SUCCESS';
  payload: {
    list: Stories;
    page: number;
  };
}

interface StoriesFetchFailureAction {
  type: 'STORIES_FETCH_FAILURE';
}

interface StoriesRemoveAction {
  type: 'REMOVE_STORY';
  payload: Story;
}

type StoriesAction =
  | StoriesFetchInitAction
  | StoriesFetchSuccessAction
  | StoriesFetchFailureAction
  | StoriesRemoveAction;

const storiesReducer = (state: StoriesState, action: StoriesAction) => {
  switch (action.type) {
    case 'STORIES_FETCH_INIT':
      return {
        ...state,
        isLoading: true,
        isError: false
      };
    case 'STORIES_FETCH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isError: false,
        data:
          action.payload.page === 0
            ? action.payload.list
            : state.data.concat(action.payload.list),
        page: action.payload.page
      };
    case 'STORIES_FETCH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isError: true
      };
    case 'REMOVE_STORY':
      return {
        ...state,
        data: state.data.filter(
          story => action.payload.objectID !== story.objectID
        )
      };
    default:
      throw new Error();
  }
};

const getSumComments = (stories: StoriesState) => {
  return stories.data.reduce((result, value) => result + value.num_comments, 0);
};

const StyledContainer = styled.div`
  height: 100vw;
  padding: 20px;

  background: #83a4d4; /* fallback for old browsers */
  background: linear-gradient(to left, #b7fbff, #83a4d4);

  color: #171212;
`;

const StyledHeadlinePrimary = styled.h1`
  font-size: 48px;
  font-weight: 300;
  letter-spacing: 2px;
`;

const StyledItem = styled.div`
  display: flex;
  align-items: center;
  padding-bottom: 5px;
`;

const StyledColumn = styled.span<{ width: string }>`
  padding: 0 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  a {
    color: inhert;
  }

  width: ${props => props.width};
`;

const StyledButton = styled.button`
  background: transparent;
  border: 1px solid #171212;
  padding: 5px;
  cursor: pointer;

  transition: all 0.1s ease-in;

  &:hover {
    background: #171212;
    color: #ffffff;

    svg {
      g {
        fill: #ffffff;
        stroke: #ffffff;
      }
    }
  }
`;

const StyledButtonSmall = styled(StyledButton)`
  padding: 5px;
`;

const StyledButtonLarge = styled(StyledButton)`
  padding: 10px;
`;

const StyledSearchForm = styled.form`
  padding: 10px 0 20px 0;
  display: flex;
  align-items: baseline;
`;

const StyledLabel = styled.label`
  border-top: 1px solid #171212;
  border-left: 1px solid #171212;
  padding-left: 5px;
  font-size: 24px;
`;

const StyledInput = styled.input`
  border: none;
  border-bottom: 1px solid #171212;
  background-color: transparent;

  font-size: 24px;
`;

const API_BASE = 'https://hn.algolia.com/api/v1';
const API_SEARCH = '/search';
const PARAM_SEARCH = 'query=';
const PARAM_PAGE = 'page=';

const getUrl = (searchTerm: string, page: number) =>
  `${API_BASE}${API_SEARCH}?${PARAM_SEARCH}${searchTerm}&${PARAM_PAGE}${page}`;

const extractSearchTerm = (url: string) =>
  url
    .substring(url.lastIndexOf('?') + 1, url.lastIndexOf('&'))
    .replace(PARAM_SEARCH, '');

const getLastSearches = (urls: Array<string>) => {
  return urls
    .reduce((result: Array<string>, url, index) => {
      const searchTerm = extractSearchTerm(url);

      if (index === 0) {
        return result.concat(searchTerm);
      }

      const previousSearchTerm = result[result.length - 1];

      if (searchTerm === previousSearchTerm) {
        return result;
      } else {
        return result.concat(searchTerm);
      }
    }, [])
    .slice(-6)
    .slice(0, -1);
};

const App = () => {
  const [searchTerm, setSearchTerm] = useSemiPersistentState('search', '');

  const [urls, setUrls] = React.useState([getUrl(searchTerm, 0)]);

  const [stories, dispatchStories] = React.useReducer(storiesReducer, {
    data: [],
    page: 0,
    isLoading: false,
    isError: false
  });

  const handleFetchStories = React.useCallback(async () => {
    dispatchStories({ type: 'STORIES_FETCH_INIT' });

    try {
      const lastUrl = urls[urls.length - 1];
      const result = await axios.get(lastUrl);

      dispatchStories({
        type: 'STORIES_FETCH_SUCCESS',
        payload: {
          list: result.data.hits,
          page: result.data.page
        }
      });
    } catch {
      dispatchStories({ type: 'STORIES_FETCH_FAILURE' });
    }
  }, [urls]);

  React.useEffect(() => {
    handleFetchStories();
  }, [handleFetchStories]);

  const handleRemoveStory = React.useCallback((item: Story) => {
    dispatchStories({ type: 'REMOVE_STORY', payload: item });
  }, []);

  const handleSearchInput = (event: React.ChangeEvent<HTMLInputElement>) =>
    setSearchTerm(event.target.value);

  const handleSearch = (searchTerm: string, page: number) => {
    const url = getUrl(searchTerm, page);
    setUrls(urls.concat(url));
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    handleSearch(searchTerm, 0);
    event.preventDefault();
  };

  const handleLastSearch = (searchTerm: string) => {
    setSearchTerm(searchTerm);
    handleSearch(searchTerm, 0);
  };

  const handleMore = () => {
    const lastUrl = urls[urls.length - 1];
    const searchTerm = extractSearchTerm(lastUrl);
    handleSearch(searchTerm, stories.page + 1);
  };

  const sumComments = React.useMemo(() => getSumComments(stories), [stories]);

  const lastSearches = getLastSearches(urls);

  return (
    <StyledContainer>
      <StyledHeadlinePrimary>
        My Hacker Stories with {sumComments} comments
      </StyledHeadlinePrimary>

      <SearchForm
        searchTerm={searchTerm}
        onSearchInput={handleSearchInput}
        onSearchSubmit={handleSearchSubmit}
      />

      <LastSearches
        lastSearches={lastSearches}
        onLastSearch={handleLastSearch}
      />

      <hr />

      {stories.isError && <p>Something went wrong ...</p>}

      <List list={stories.data} onRemoveItem={handleRemoveStory} />

      {stories.isLoading ? (
        <p>Loading ...</p>
      ) : (
        <button type="button" onClick={handleMore}>
          More
        </button>
      )}
    </StyledContainer>
  );
};

type LastSearchesProps = {
  lastSearches: Array<string>;
  onLastSearch: (searchTerm: string) => void;
};

const LastSearches = ({ lastSearches, onLastSearch }: LastSearchesProps) => (
  <>
    {lastSearches.map((searchTerm: string, index: number) => (
      <button
        key={searchTerm + index}
        type="button"
        onClick={() => onLastSearch(searchTerm)}
      >
        {searchTerm}
      </button>
    ))}
  </>
);

type InputWithLabelProps = {
  id: string;
  value: string;
  type?: string;
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isFocused?: boolean;
  children: React.ReactNode;
};

const InputWithLabel = ({
  id,
  value,
  type = 'text',
  onInputChange,
  isFocused,
  children
}: InputWithLabelProps) => {
  const inputRef = React.useRef<HTMLInputElement>(null!);

  React.useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused]);

  return (
    <>
      <StyledLabel htmlFor={id}>{children}</StyledLabel>
      <StyledInput
        ref={inputRef}
        id={id}
        type={type}
        value={value}
        onChange={onInputChange}
      />
    </>
  );
};

type SearchFormProps = {
  searchTerm: string;
  onSearchInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

const SearchForm = ({
  searchTerm,
  onSearchInput,
  onSearchSubmit
}: SearchFormProps) => (
  <StyledSearchForm onSubmit={onSearchSubmit}>
    <InputWithLabel
      id="search"
      value={searchTerm}
      isFocused
      onInputChange={onSearchInput}
    >
      <strong>Search</strong>
    </InputWithLabel>

    <StyledButtonLarge type="submit" disabled={!searchTerm}>
      Submit
    </StyledButtonLarge>
  </StyledSearchForm>
);

const StyledHeaderButton = styled.button<{ backgroundColor: boolean }>`
  background: transparent;
  border: 1px solid #171212;
  padding: 5px;
  background-color: ${props =>
    props.backgroundColor ? '#EDBCBC' : 'transparent'};
`;

type ListProps = {
  list: Stories;
  onRemoveItem: (item: Story) => void;
};

const SORTS = {
  NONE: (list: Stories) => list,
  TITLE: (list: Stories) => sortBy(list, 'title'),
  AUTHOR: (list: Stories) => sortBy(list, 'author'),
  COMMENT: (list: Stories) => sortBy(list, 'num_comments').reverse(),
  POINT: (list: Stories) => sortBy(list, 'points').reverse()
};

const List = ({ list, onRemoveItem }: ListProps) => {
  const defaultBtnStates = {
    TITLE: false,
    AUTHOR: false,
    COMMENT: false,
    POINT: false
  };
  const [sort, setSort] = React.useState({ sortKey: 'NONE', isReverse: false });
  const [activeBtn, setActiveBtn] = React.useState(defaultBtnStates);

  const handleSort = (sortKey: string) => {
    const isReverse = sort.sortKey === sortKey && !sort.isReverse; // when user click on the same button again
    setSort({ sortKey, isReverse });
    setActiveBtn({ ...defaultBtnStates, ...{ [sortKey]: true } });
  };

  const sortFunction = SORTS[sort.sortKey as keyof typeof SORTS];
  const sortedList = sort.isReverse
    ? sortFunction(list).reverse()
    : sortFunction(list);

  return (
    <div>
      <div style={{ display: 'flex' }}>
        <span style={{ width: '40%' }}>
          <StyledHeaderButton
            backgroundColor={activeBtn['TITLE']}
            type="button"
            onClick={() => handleSort('TITLE')}
          >
            Title
            {sort.sortKey === 'TITLE' ? (
              sort.isReverse ? (
                <DownArrow height="14px" width="14px" />
              ) : (
                <UpArrow height="14px" width="14px" />
              )
            ) : null}
          </StyledHeaderButton>
        </span>
        <span style={{ width: '30%' }}>
          <StyledHeaderButton
            backgroundColor={activeBtn['AUTHOR']}
            type="button"
            onClick={() => handleSort('AUTHOR')}
          >
            Author
            {sort.sortKey === 'AUTHOR' ? (
              sort.isReverse ? (
                <DownArrow height="14px" width="14px" />
              ) : (
                <UpArrow height="14px" width="14px" />
              )
            ) : null}
          </StyledHeaderButton>
        </span>
        <span style={{ width: '10%' }}>
          <StyledHeaderButton
            backgroundColor={activeBtn['COMMENT']}
            type="button"
            onClick={() => handleSort('COMMENT')}
          >
            Comments
            {sort.sortKey === 'COMMENT' ? (
              sort.isReverse ? (
                <UpArrow height="14px" width="14px" />
              ) : (
                <DownArrow height="14px" width="14px" />
              )
            ) : null}
          </StyledHeaderButton>
        </span>
        <span style={{ width: '10%' }}>
          <StyledHeaderButton
            backgroundColor={activeBtn['POINT']}
            type="button"
            onClick={() => handleSort('POINT')}
          >
            Points
            {sort.sortKey === 'POINT' ? (
              sort.isReverse ? (
                <UpArrow height="14px" width="14px" />
              ) : (
                <DownArrow height="14px" width="14px" />
              )
            ) : null}
          </StyledHeaderButton>
        </span>
        <span style={{ width: '10%' }}>Actions</span>
      </div>

      {sortedList.map((item: Story) => (
        <Item key={item.objectID} item={item} onRemoveItem={onRemoveItem} />
      ))}
    </div>
  );
};

type ItemProps = {
  item: Story;
  onRemoveItem: (item: Story) => void;
};

const Item = ({ item, onRemoveItem }: ItemProps) => (
  <StyledItem>
    <StyledColumn width="40%">
      <a href={item.url}>{item.title}</a>
    </StyledColumn>
    <StyledColumn width="30%">{item.author}</StyledColumn>
    <StyledColumn width="10%">{item.num_comments}</StyledColumn>
    <StyledColumn width="10%">{item.points}</StyledColumn>
    <StyledColumn width="10%">
      <StyledButtonSmall type="button" onClick={() => onRemoveItem(item)}>
        <Check height="18px" width="18px" />
      </StyledButtonSmall>
    </StyledColumn>
  </StyledItem>
);

export default App;

export { SearchForm, InputWithLabel, List, Item };

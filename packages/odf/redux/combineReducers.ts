import { combineReducers } from 'redux';
import { odfNamespaceReducer } from './reducers';
import { odfNamespaceReducerName } from './selectors';

export default combineReducers({
  [odfNamespaceReducerName]: odfNamespaceReducer,
});

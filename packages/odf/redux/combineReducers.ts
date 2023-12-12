import { combineReducers } from 'redux';
import { odfNamespaceReducer, odfSystemFlagsReducer } from './reducers';
import {
  odfNamespaceReducerName,
  odfSystemFlagsReducerName,
} from './selectors';

export default combineReducers({
  [odfNamespaceReducerName]: odfNamespaceReducer,
  [odfSystemFlagsReducerName]: odfSystemFlagsReducer,
});

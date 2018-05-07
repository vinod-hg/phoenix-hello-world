defmodule Hello.RoomOwner do
  use GenServer
  require Record

  Record.defrecord :room_state, [name: "" , users: [], counter: 0, msgs: :queue.new()]

  @type room_state :: record(:room_state, name: String.t, counter: integer, msgs: :queue.t)
  # expands to: "@type user :: {:user, String.t, integer}"
  ## Client API

  @doc """
  Starts Room owener global process with global name as that of the room
  """
  def start_link(room_name) do
    room = String.to_atom(room_name)
    GenServer.start_link(__MODULE__, room, [{:name, ref room_name}])
  end

  @doc """
  New user
  """
  def new_user(room, user) do
    GenServer.call(ref(room), {:new_user, user})
  end

  @doc """
  New user
  """
  def user_left(room, user) do
    GenServer.call(ref(room), {:user_left, user})
  end

  @doc """
  New message
  """
  def new_msg(room, msg) do
    GenServer.call(ref(room), {:new_msg, msg})
  end

  @doc """
  Get all messages
  """
  def get_all_msgs(room) do
    GenServer.call(ref(room), :get_all_messages)
  end

  def ref(room) do
    {:global, String.to_atom(room)}
  end

  ## Server Callbacks

  def init(room) do
    state = room_state(name: room)
    {:ok, state}
  end

  def handle_call({:new_user, user}, _from, state = room_state(users: users)) do
    users = [user | users]
    {:reply, {:ok, users}, room_state(state, users: users)}
  end

  def handle_call({:user_left, user}, _from, state = room_state(users: users)) do
    users = List.delete(users, user)
    {:reply, {:ok, users}, room_state(state, users: users)}
  end

  def handle_call({:new_msg, msg}, _from, state = room_state(counter: counter, msgs: msgs)) do
    counter = counter + 1
    {:reply, counter, room_state(state, counter: counter, msgs: :queue.in({counter, msg}, msgs))}
  end

  def handle_call(:get_all_messages, _from, state = room_state(msgs: msgs)) do
    {:reply, :queue.to_list(msgs), state}
  end

end

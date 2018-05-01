defmodule HelloWeb.RoomChannel do
  use Phoenix.Channel
  require Logger

  @doc """
  Authorize socket to subscribe and broadcast events on this channel & topic

  Possible Return Values

  `{:ok, socket}` to authorize subscription for channel for requested topic

  `:ignore` to deny subscription/broadcast on this channel
  for the requested topic
  """
  def join("room:" <> _private_subtopic, message, socket) do
    Process.flag(:trap_exit, true)
    :timer.send_interval(5000, :ping)
    send(self(), {:after_join, message})
    Logger.info"> joined #{inspect message}"
    {:ok, socket}
  end

  # def join("room:" <> _private_subtopic, message, _socket) do
  #   Logger.info"> error #{inspect message}"
  #   {:error, %{reason: "unauthorized"}}
  # end

  def handle_info({:after_join, msg}, socket) do
    broadcast! socket, "user:entered", %{user: msg["user"]}
    push socket, "join", %{status: "connected"}
    {:noreply, socket}
  end
  def handle_info(:ping, socket) do
    push socket, "new:msg", %{user: "SYSTEM", body: "ping"}
    {:noreply, socket}
  end

  def terminate(reason, _socket) do
    Logger.debug"> leave #{inspect reason}"
    :ok
  end

  def handle_in("new_msg", msg, socket) do
    # Logger.info"> received msg #{inspect msg}"
    broadcast! socket, "new_msg", %{user: msg["user"], body: msg["body"]}
    {:reply, {:ok, %{msg: msg["body"]}}, assign(socket, :user, msg["user"])}
  end

  intercept ["user_joined"]

  def handle_out("user_joined", msg, socket) do
    Logger.info"> user joined #{inspect msg}"
    if Accounts.ignoring_user?(socket.assigns[:user], msg.user_id) do
      {:noreply, socket}
    else
      push socket, "user_joined", msg
      {:noreply, socket}
    end
  end

end
